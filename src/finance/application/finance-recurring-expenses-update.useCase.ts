import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringExpenseUpdateDto } from "../infrastructure/dtos/finance-recurring-expense-update.dto";
import { FinanceRecurringExpense } from "src/finance/domain/finance-recurring-expense";

@Injectable()
export class FinanceRecurringExpensesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    ruleId: string,
    body: FinanceRecurringExpenseUpdateDto,
    userId: string
  ): Promise<FinanceRecurringExpense> {
    if (body.categoryId) {
      const categories = await this.ledger.findExpenseCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría no encontrada");
      }
    }
    try {
      const updated = await this.ledger.updateRecurringExpenseRule(
        userId,
        ruleId,
        {
          categoryId: body.categoryId,
          amount: body.amount,
          dayOfMonth: body.dayOfMonth,
          label: body.label,
          notes: body.notes,
          isActive: body.isActive,
        }
      );
      if (!updated) {
        throw new NotFoundException("Regla recurrente no encontrada");
      }
      return updated;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (e instanceof Error && e.message === "Categoría no encontrada") {
        throw new NotFoundException("Categoría no encontrada");
      }
      throw e;
    }
  }
}
