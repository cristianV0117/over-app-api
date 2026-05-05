import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringIncomeUpdateDto } from "../infrastructure/dtos/finance-recurring-income-update.dto";
import { FinanceRecurringIncome } from "src/finance/domain/finance-recurring-income";

@Injectable()
export class FinanceRecurringIncomesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    id: string,
    body: FinanceRecurringIncomeUpdateDto,
    userId: string
  ): Promise<FinanceRecurringIncome> {
    if (body.categoryId) {
      const categories = await this.ledger.findIncomeCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría de ingreso no encontrada");
      }
    }
    try {
      const updated = await this.ledger.updateRecurringIncomeRule(
        userId,
        id,
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
        throw new NotFoundException("Regla de ingreso recurrente no encontrada");
      }
      return updated;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (
        e instanceof Error &&
        e.message === "Categoría de ingreso no encontrada"
      ) {
        throw new NotFoundException("Categoría de ingreso no encontrada");
      }
      throw e;
    }
  }
}
