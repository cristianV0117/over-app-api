import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringExpenseStoreDto } from "../infrastructure/dtos/finance-recurring-expense-store.dto";
import { FinanceRecurringExpense } from "src/finance/domain/finance-recurring-expense";

@Injectable()
export class FinanceRecurringExpensesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceRecurringExpenseStoreDto,
    userId: string
  ): Promise<FinanceRecurringExpense> {
    const categories = await this.ledger.findExpenseCategoriesByUser(userId);
    if (!categories.some((c) => c.id === body.categoryId)) {
      throw new NotFoundException("Categoría no encontrada");
    }
    try {
      return await this.ledger.createRecurringExpenseRule(userId, {
        categoryId: body.categoryId,
        amount: body.amount,
        dayOfMonth: body.dayOfMonth,
        label: body.label,
        notes: body.notes,
        isActive: body.isActive,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "Categoría no encontrada") {
        throw new NotFoundException("Categoría no encontrada");
      }
      throw e;
    }
  }
}
