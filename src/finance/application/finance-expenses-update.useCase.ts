import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpenseUpdateDto } from "../infrastructure/dtos/finance-expense-update.dto";
import { FinanceExpense } from "src/finance/domain/finance-expense";

@Injectable()
export class FinanceExpensesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    expenseId: string,
    body: FinanceExpenseUpdateDto,
    userId: string
  ): Promise<FinanceExpense> {
    if (expenseId.startsWith("recurring:")) {
      throw new BadRequestException(
        "Este ítem es un gasto recurrente: edítalo en «Gastos recurrentes»"
      );
    }
    if (body.categoryId) {
      const categories = await this.ledger.findExpenseCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría no encontrada");
      }
    }
    try {
      const updated = await this.ledger.updateExpense(userId, expenseId, {
        categoryId: body.categoryId,
        amount: body.amount,
        occurredAt: body.occurredAt,
        notes: body.notes,
      });
      if (!updated) {
        throw new NotFoundException("Gasto no encontrado");
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
