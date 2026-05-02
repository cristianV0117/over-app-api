import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  FinanceCategoryDeleteResult,
  FinanceIncomeCategoryDeleteResult,
  FinanceLedgerRepository,
} from "src/finance/domain/repositories/finance-ledger.repository";
import { ExpenseCategory } from "src/finance/domain/expense-category";
import { FinanceExpense } from "src/finance/domain/finance-expense";
import { IncomeCategory } from "src/finance/domain/income-category";
import { FinanceIncomeLine } from "src/finance/domain/finance-income-line";
import { FinanceRecurringExpense } from "src/finance/domain/finance-recurring-expense";
import {
  FinanceExpenseCategoryModel,
  FinanceExpenseCategoryDocument,
} from "src/shared/infrastructure/mongo/schemas/finance-expense-category.schema";
import {
  FinanceExpenseModel,
  FinanceExpenseDocument,
} from "src/shared/infrastructure/mongo/schemas/finance-expense.schema";
import {
  FinanceIncomeCategoryModel,
  FinanceIncomeCategoryDocument,
} from "src/shared/infrastructure/mongo/schemas/finance-income-category.schema";
import {
  FinanceIncomeModel,
  FinanceIncomeDocument,
} from "src/shared/infrastructure/mongo/schemas/finance-income.schema";
import {
  FinanceRecurringExpenseModel,
  FinanceRecurringExpenseDocument,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense.schema";

export const RECURRING_EXPENSE_ID_PREFIX = "recurring:";

function monthRangeUtc(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}

export class FinanceLedgerImplementation implements FinanceLedgerRepository {
  constructor(
    @InjectModel(FinanceIncomeCategoryModel.name)
    private readonly incomeCategoryModel: Model<FinanceIncomeCategoryDocument>,
    @InjectModel(FinanceIncomeModel.name)
    private readonly incomeModel: Model<FinanceIncomeDocument>,
    @InjectModel(FinanceExpenseCategoryModel.name)
    private readonly expenseCategoryModel: Model<FinanceExpenseCategoryDocument>,
    @InjectModel(FinanceExpenseModel.name)
    private readonly expenseModel: Model<FinanceExpenseDocument>,
    @InjectModel(FinanceRecurringExpenseModel.name)
    private readonly recurringExpenseModel: Model<FinanceRecurringExpenseDocument>
  ) {}

  async findIncomeCategoriesByUser(userId: string): Promise<IncomeCategory[]> {
    const docs = await this.incomeCategoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map(
      (d) =>
        new IncomeCategory({
          id: (d._id as Types.ObjectId).toString(),
          userId: (d.userId as Types.ObjectId).toString(),
          name: d.name,
        })
    );
  }

  async createIncomeCategory(
    userId: string,
    name: string
  ): Promise<IncomeCategory> {
    const created = await this.incomeCategoryModel.create({
      userId: new Types.ObjectId(userId),
      name: name.trim(),
    });
    return new IncomeCategory({
      id: (created._id as Types.ObjectId).toString(),
      userId: (created.userId as Types.ObjectId).toString(),
      name: created.name,
    });
  }

  async updateIncomeCategory(
    userId: string,
    id: string,
    name: string
  ): Promise<IncomeCategory | null> {
    const updated = await this.incomeCategoryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { $set: { name: name.trim() } },
        { new: true }
      )
      .lean()
      .exec();
    if (!updated) return null;
    return new IncomeCategory({
      id: (updated._id as Types.ObjectId).toString(),
      userId: (updated.userId as Types.ObjectId).toString(),
      name: updated.name,
    });
  }

  async deleteIncomeCategory(
    userId: string,
    id: string
  ): Promise<FinanceIncomeCategoryDeleteResult> {
    const uid = new Types.ObjectId(userId);
    const cid = new Types.ObjectId(id);
    const n = await this.incomeModel.countDocuments({
      userId: uid,
      categoryId: cid,
    });
    if (n > 0) return "has_incomes";
    const res = await this.incomeCategoryModel.findOneAndDelete({
      _id: cid,
      userId: uid,
    });
    return res ? "deleted" : "not_found";
  }

  async createIncome(
    userId: string,
    categoryId: string,
    amount: number,
    receivedAt: Date,
    notes?: string
  ): Promise<FinanceIncomeLine> {
    const uid = new Types.ObjectId(userId);
    const cat = await this.incomeCategoryModel
      .findOne({ _id: new Types.ObjectId(categoryId), userId: uid })
      .lean()
      .exec();
    if (!cat) {
      throw new Error("Categoría de ingreso no encontrada");
    }
    const created = await this.incomeModel.create({
      userId: uid,
      categoryId: new Types.ObjectId(categoryId),
      amount,
      receivedAt,
      notes: notes?.trim() ?? "",
    });
    const populated = await this.incomeModel
      .findById(created._id)
      .populate<{ categoryId: FinanceIncomeCategoryModel }>("categoryId")
      .lean()
      .exec();
    return this.mapIncomeDoc(populated as unknown as Record<string, unknown>);
  }

  async findIncomesForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceIncomeLine[]> {
    const { start, end } = monthRangeUtc(year, month);
    const docs = await this.incomeModel
      .find({
        userId: new Types.ObjectId(userId),
        receivedAt: { $gte: start, $lt: end },
      })
      .populate<{ categoryId: FinanceIncomeCategoryModel }>("categoryId")
      .sort({ receivedAt: -1 })
      .lean()
      .exec();
    return docs.map((d) =>
      this.mapIncomeDoc(d as unknown as Record<string, unknown>)
    );
  }

  async updateIncome(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      receivedAt?: Date;
      notes?: string;
    }
  ): Promise<FinanceIncomeLine | null> {
    const uid = new Types.ObjectId(userId);
    if (patch.categoryId) {
      const cat = await this.incomeCategoryModel
        .findOne({
          _id: new Types.ObjectId(patch.categoryId),
          userId: uid,
        })
        .lean()
        .exec();
      if (!cat) throw new Error("Categoría de ingreso no encontrada");
    }
    const $set: Record<string, unknown> = {};
    if (patch.categoryId !== undefined)
      $set.categoryId = new Types.ObjectId(patch.categoryId);
    if (patch.amount !== undefined) $set.amount = patch.amount;
    if (patch.receivedAt !== undefined) $set.receivedAt = patch.receivedAt;
    if (patch.notes !== undefined) $set.notes = patch.notes.trim();
    if (Object.keys($set).length === 0) {
      const existing = await this.incomeModel
        .findOne({ _id: new Types.ObjectId(id), userId: uid })
        .populate<{ categoryId: FinanceIncomeCategoryModel }>("categoryId")
        .lean()
        .exec();
      return existing
        ? this.mapIncomeDoc(existing as unknown as Record<string, unknown>)
        : null;
    }
    const updated = await this.incomeModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: uid },
        { $set },
        { new: true }
      )
      .populate<{ categoryId: FinanceIncomeCategoryModel }>("categoryId")
      .lean()
      .exec();
    if (!updated) return null;
    return this.mapIncomeDoc(updated as unknown as Record<string, unknown>);
  }

  async deleteIncome(userId: string, id: string): Promise<boolean> {
    const res = await this.incomeModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    return !!res;
  }

  async findExpenseCategoriesByUser(userId: string): Promise<ExpenseCategory[]> {
    const docs = await this.expenseCategoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map(
      (d) =>
        new ExpenseCategory({
          id: (d._id as Types.ObjectId).toString(),
          userId: (d.userId as Types.ObjectId).toString(),
          name: d.name,
        })
    );
  }

  async createExpenseCategory(
    userId: string,
    name: string
  ): Promise<ExpenseCategory> {
    const created = await this.expenseCategoryModel.create({
      userId: new Types.ObjectId(userId),
      name: name.trim(),
    });
    return new ExpenseCategory({
      id: (created._id as Types.ObjectId).toString(),
      userId: (created.userId as Types.ObjectId).toString(),
      name: created.name,
    });
  }

  async updateExpenseCategory(
    userId: string,
    id: string,
    name: string
  ): Promise<ExpenseCategory | null> {
    const updated = await this.expenseCategoryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { $set: { name: name.trim() } },
        { new: true }
      )
      .lean()
      .exec();
    if (!updated) return null;
    return new ExpenseCategory({
      id: (updated._id as Types.ObjectId).toString(),
      userId: (updated.userId as Types.ObjectId).toString(),
      name: updated.name,
    });
  }

  async deleteExpenseCategory(
    userId: string,
    id: string
  ): Promise<FinanceCategoryDeleteResult> {
    const uid = new Types.ObjectId(userId);
    const cid = new Types.ObjectId(id);
    const n = await this.expenseModel.countDocuments({
      userId: uid,
      categoryId: cid,
    });
    if (n > 0) return "has_expenses";
    const nr = await this.recurringExpenseModel.countDocuments({
      userId: uid,
      categoryId: cid,
    });
    if (nr > 0) return "has_recurring";
    const res = await this.expenseCategoryModel.findOneAndDelete({
      _id: cid,
      userId: uid,
    });
    return res ? "deleted" : "not_found";
  }

  async createExpense(
    userId: string,
    categoryId: string,
    amount: number,
    occurredAt: Date,
    notes?: string
  ): Promise<FinanceExpense> {
    const uid = new Types.ObjectId(userId);
    const cat = await this.expenseCategoryModel
      .findOne({ _id: new Types.ObjectId(categoryId), userId: uid })
      .lean()
      .exec();
    if (!cat) {
      throw new Error("Categoría no encontrada");
    }
    const created = await this.expenseModel.create({
      userId: uid,
      categoryId: new Types.ObjectId(categoryId),
      amount,
      occurredAt,
      notes: notes?.trim() ?? "",
    });
    const populated = await this.expenseModel
      .findById(created._id)
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .lean()
      .exec();
    return this.mapExpenseDoc(populated as unknown as Record<string, unknown>);
  }

  async findExpensesForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceExpense[]> {
    const { start, end } = monthRangeUtc(year, month);
    const docs = await this.expenseModel
      .find({
        userId: new Types.ObjectId(userId),
        occurredAt: { $gte: start, $lt: end },
      })
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .sort({ occurredAt: -1 })
      .lean()
      .exec();
    const mappedReal = docs.map((d) =>
      this.mapExpenseDoc(d as unknown as Record<string, unknown>)
    );
    const recurringDocs = await this.recurringExpenseModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .lean()
      .exec();
    const synthetic = recurringDocs.map((r) =>
      this.syntheticExpenseFromRecurringRule(
        r as unknown as Record<string, unknown>,
        userId,
        year,
        month
      )
    );
    return [...mappedReal, ...synthetic].sort(
      (a, b) =>
        b.toJSON().occurredAt.getTime() - a.toJSON().occurredAt.getTime()
    );
  }

  async updateExpense(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      occurredAt?: Date;
      notes?: string;
    }
  ): Promise<FinanceExpense | null> {
    const uid = new Types.ObjectId(userId);
    if (patch.categoryId) {
      const cat = await this.expenseCategoryModel
        .findOne({
          _id: new Types.ObjectId(patch.categoryId),
          userId: uid,
        })
        .lean()
        .exec();
      if (!cat) throw new Error("Categoría no encontrada");
    }
    const $set: Record<string, unknown> = {};
    if (patch.categoryId !== undefined)
      $set.categoryId = new Types.ObjectId(patch.categoryId);
    if (patch.amount !== undefined) $set.amount = patch.amount;
    if (patch.occurredAt !== undefined) $set.occurredAt = patch.occurredAt;
    if (patch.notes !== undefined) $set.notes = patch.notes.trim();
    if (Object.keys($set).length === 0) {
      const existing = await this.expenseModel
        .findOne({ _id: new Types.ObjectId(id), userId: uid })
        .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
        .lean()
        .exec();
      return existing
        ? this.mapExpenseDoc(existing as unknown as Record<string, unknown>)
        : null;
    }
    const updated = await this.expenseModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: uid },
        { $set },
        { new: true }
      )
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .lean()
      .exec();
    if (!updated) return null;
    return this.mapExpenseDoc(updated as unknown as Record<string, unknown>);
  }

  async deleteExpense(userId: string, id: string): Promise<boolean> {
    const res = await this.expenseModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    return !!res;
  }

  async findRecurringExpenseRulesByUser(
    userId: string
  ): Promise<FinanceRecurringExpense[]> {
    const docs = await this.recurringExpenseModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .sort({ isActive: -1, label: 1, createdAt: 1 })
      .lean()
      .exec();
    return docs.map((d) =>
      this.mapRecurringRuleEntity(d as unknown as Record<string, unknown>)
    );
  }

  async createRecurringExpenseRule(
    userId: string,
    data: {
      categoryId: string;
      amount: number;
      dayOfMonth: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringExpense> {
    const uid = new Types.ObjectId(userId);
    const cat = await this.expenseCategoryModel
      .findOne({ _id: new Types.ObjectId(data.categoryId), userId: uid })
      .lean()
      .exec();
    if (!cat) {
      throw new Error("Categoría no encontrada");
    }
    const day = Math.min(31, Math.max(1, Math.floor(data.dayOfMonth)));
    const created = await this.recurringExpenseModel.create({
      userId: uid,
      categoryId: new Types.ObjectId(data.categoryId),
      amount: data.amount,
      dayOfMonth: day,
      label: data.label?.trim() ?? "",
      notes: data.notes?.trim() ?? "",
      isActive: data.isActive ?? true,
    });
    const populated = await this.recurringExpenseModel
      .findById(created._id)
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .lean()
      .exec();
    return this.mapRecurringRuleEntity(
      populated as unknown as Record<string, unknown>
    );
  }

  async updateRecurringExpenseRule(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      dayOfMonth?: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringExpense | null> {
    const uid = new Types.ObjectId(userId);
    if (patch.categoryId) {
      const cat = await this.expenseCategoryModel
        .findOne({
          _id: new Types.ObjectId(patch.categoryId),
          userId: uid,
        })
        .lean()
        .exec();
      if (!cat) throw new Error("Categoría no encontrada");
    }
    const $set: Record<string, unknown> = {};
    if (patch.categoryId !== undefined)
      $set.categoryId = new Types.ObjectId(patch.categoryId);
    if (patch.amount !== undefined) $set.amount = patch.amount;
    if (patch.dayOfMonth !== undefined)
      $set.dayOfMonth = Math.min(31, Math.max(1, Math.floor(patch.dayOfMonth)));
    if (patch.label !== undefined) $set.label = patch.label.trim();
    if (patch.notes !== undefined) $set.notes = patch.notes.trim();
    if (patch.isActive !== undefined) $set.isActive = patch.isActive;
    if (Object.keys($set).length === 0) {
      const existing = await this.recurringExpenseModel
        .findOne({ _id: new Types.ObjectId(id), userId: uid })
        .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
        .lean()
        .exec();
      return existing
        ? this.mapRecurringRuleEntity(existing as unknown as Record<string, unknown>)
        : null;
    }
    const updated = await this.recurringExpenseModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: uid },
        { $set },
        { new: true }
      )
      .populate<{ categoryId: FinanceExpenseCategoryModel }>("categoryId")
      .lean()
      .exec();
    if (!updated) return null;
    return this.mapRecurringRuleEntity(updated as unknown as Record<string, unknown>);
  }

  async deleteRecurringExpenseRule(userId: string, id: string): Promise<boolean> {
    const res = await this.recurringExpenseModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    return !!res;
  }

  private lastDayOfMonthUtc(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  private syntheticExpenseFromRecurringRule(
    rule: Record<string, unknown>,
    userId: string,
    year: number,
    month: number
  ): FinanceExpense {
    const ruleId = (rule._id as Types.ObjectId).toString();
    const catRaw = rule.categoryId;
    let categoryId: string;
    let categoryName: string | undefined;
    if (
      catRaw &&
      typeof catRaw === "object" &&
      !(catRaw instanceof Types.ObjectId)
    ) {
      const c = catRaw as { _id?: Types.ObjectId; name?: string };
      categoryId = (c._id ?? (catRaw as { _id: Types.ObjectId })._id).toString();
      categoryName = c.name;
    } else {
      categoryId = (catRaw as Types.ObjectId).toString();
    }
    const dom = Math.min(31, Math.max(1, (rule.dayOfMonth as number) || 1));
    const last = this.lastDayOfMonthUtc(year, month);
    const day = Math.min(dom, last);
    const occurredAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const label = ((rule.label as string) ?? "").trim();
    const notes = ((rule.notes as string) ?? "").trim();
    return new FinanceExpense({
      id: `${RECURRING_EXPENSE_ID_PREFIX}${ruleId}`,
      userId,
      categoryId,
      categoryName,
      amount: rule.amount as number,
      occurredAt,
      notes,
      label: label || undefined,
      isRecurring: true,
      recurringRuleId: ruleId,
    });
  }

  private mapRecurringRuleEntity(d: Record<string, unknown>): FinanceRecurringExpense {
    const _id = d._id as Types.ObjectId;
    const userId = d.userId as Types.ObjectId;
    const catRaw = d.categoryId;
    let categoryId: string;
    let categoryName: string | undefined;
    if (
      catRaw &&
      typeof catRaw === "object" &&
      !(catRaw instanceof Types.ObjectId)
    ) {
      const c = catRaw as { _id?: Types.ObjectId; name?: string };
      categoryId = (c._id ?? (catRaw as { _id: Types.ObjectId })._id).toString();
      categoryName = c.name;
    } else {
      categoryId = (catRaw as Types.ObjectId).toString();
    }
    return new FinanceRecurringExpense({
      id: _id.toString(),
      userId: userId.toString(),
      categoryId,
      categoryName,
      amount: d.amount as number,
      dayOfMonth: d.dayOfMonth as number,
      label: (d.label as string) ?? "",
      notes: (d.notes as string) ?? "",
      isActive: (d.isActive as boolean) ?? true,
    });
  }

  private mapIncomeDoc(d: Record<string, unknown>): FinanceIncomeLine {
    const raw = d;
    const _id = raw._id as Types.ObjectId;
    const userId = raw.userId as Types.ObjectId;
    const catRaw = raw.categoryId;
    let categoryId: string;
    let categoryName: string | undefined;
    if (
      catRaw &&
      typeof catRaw === "object" &&
      !(catRaw instanceof Types.ObjectId)
    ) {
      const c = catRaw as { _id?: Types.ObjectId; name?: string };
      categoryId = (c._id ?? (catRaw as { _id: Types.ObjectId })._id).toString();
      categoryName = c.name;
    } else {
      categoryId = (catRaw as Types.ObjectId).toString();
    }
    return new FinanceIncomeLine({
      id: _id.toString(),
      userId: userId.toString(),
      categoryId,
      categoryName,
      amount: raw.amount as number,
      receivedAt: raw.receivedAt as Date,
      notes: (raw.notes as string) ?? "",
    });
  }

  private mapExpenseDoc(d: Record<string, unknown>): FinanceExpense {
    const raw = d;
    const _id = raw._id as Types.ObjectId;
    const userId = raw.userId as Types.ObjectId;
    const catRaw = raw.categoryId;
    let categoryId: string;
    let categoryName: string | undefined;
    if (
      catRaw &&
      typeof catRaw === "object" &&
      !(catRaw instanceof Types.ObjectId)
    ) {
      const c = catRaw as { _id?: Types.ObjectId; name?: string };
      categoryId = (c._id ?? (catRaw as { _id: Types.ObjectId })._id).toString();
      categoryName = c.name;
    } else {
      categoryId = (catRaw as Types.ObjectId).toString();
    }
    return new FinanceExpense({
      id: _id.toString(),
      userId: userId.toString(),
      categoryId,
      categoryName,
      amount: raw.amount as number,
      occurredAt: raw.occurredAt as Date,
      notes: (raw.notes as string) ?? "",
    });
  }
}
