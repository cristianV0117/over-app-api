import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

export type FinanceMonthlySummaryResult = {
  year: number;
  month: number;
  currency: "COP";
  income: number;
  incomeBreakdown: { categoryId: string; categoryName: string; total: number }[];
  incomes: Array<{
    id: string;
    userId: string;
    categoryId: string;
    categoryName?: string;
    amount: number;
    receivedAt: Date;
    notes: string;
  }>;
  totalExpenses: number;
  expenseBreakdown: { categoryId: string; categoryName: string; total: number }[];
  expenses: Array<{
    id: string;
    userId: string;
    categoryId: string;
    categoryName?: string;
    amount: number;
    occurredAt: Date;
    notes: string;
    label?: string;
    isRecurring: boolean;
    recurringRuleId?: string;
  }>;
  remaining: number;
};

@Injectable()
export class FinanceMonthlySummaryUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceMonthlySummaryResult> {
    const [incomes, expenses, incomeCats, expenseCats] = await Promise.all([
      this.ledger.findIncomesForMonth(userId, year, month),
      this.ledger.findExpensesForMonth(userId, year, month),
      this.ledger.findIncomeCategoriesByUser(userId),
      this.ledger.findExpenseCategoriesByUser(userId),
    ]);

    const incomeCatMap = new Map(incomeCats.map((c) => [c.id, c.name]));
    const expenseCatMap = new Map(expenseCats.map((c) => [c.id, c.name]));

    const incomeBreakdownMap = new Map<
      string,
      { categoryId: string; categoryName: string; total: number }
    >();
    let income = 0;
    for (const row of incomes) {
      const j = row.toJSON();
      income += j.amount;
      const name =
        j.categoryName ?? incomeCatMap.get(j.categoryId) ?? "Sin categoría";
      const prev = incomeBreakdownMap.get(j.categoryId);
      if (prev) prev.total += j.amount;
      else
        incomeBreakdownMap.set(j.categoryId, {
          categoryId: j.categoryId,
          categoryName: name,
          total: j.amount,
        });
    }

    const expenseBreakdownMap = new Map<
      string,
      { categoryId: string; categoryName: string; total: number }
    >();
    let totalExpenses = 0;
    for (const e of expenses) {
      const row = e.toJSON();
      totalExpenses += row.amount;
      const name =
        row.categoryName ??
        expenseCatMap.get(row.categoryId) ??
        "Sin categoría";
      const prev = expenseBreakdownMap.get(row.categoryId);
      if (prev) prev.total += row.amount;
      else
        expenseBreakdownMap.set(row.categoryId, {
          categoryId: row.categoryId,
          categoryName: name,
          total: row.amount,
        });
    }

    return {
      year,
      month,
      currency: "COP",
      income,
      incomeBreakdown: [...incomeBreakdownMap.values()].sort(
        (a, b) => b.total - a.total
      ),
      incomes: incomes.map((x) => x.toJSON()),
      totalExpenses,
      expenseBreakdown: [...expenseBreakdownMap.values()].sort(
        (a, b) => b.total - a.total
      ),
      expenses: expenses.map((x) => x.toJSON()),
      remaining: income - totalExpenses,
    };
  }
}
