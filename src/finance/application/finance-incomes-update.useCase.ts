import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeUpdateDto } from "../infrastructure/dtos/finance-income-update.dto";
import { FinanceIncomeLine } from "src/finance/domain/finance-income-line";

@Injectable()
export class FinanceIncomesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    incomeId: string,
    body: FinanceIncomeUpdateDto,
    userId: string
  ): Promise<FinanceIncomeLine> {
    if (body.categoryId) {
      const categories = await this.ledger.findIncomeCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría de ingreso no encontrada");
      }
    }
    try {
      const updated = await this.ledger.updateIncome(userId, incomeId, {
        categoryId: body.categoryId,
        amount: body.amount,
        receivedAt: body.receivedAt,
        notes: body.notes,
      });
      if (!updated) {
        throw new NotFoundException("Ingreso no encontrado");
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
