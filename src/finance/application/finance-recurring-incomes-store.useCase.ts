import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringIncomeStoreDto } from "../infrastructure/dtos/finance-recurring-income-store.dto";
import { FinanceRecurringIncome } from "src/finance/domain/finance-recurring-income";

@Injectable()
export class FinanceRecurringIncomesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceRecurringIncomeStoreDto,
    userId: string
  ): Promise<FinanceRecurringIncome> {
    const categories = await this.ledger.findIncomeCategoriesByUser(userId);
    if (!categories.some((c) => c.id === body.categoryId)) {
      throw new NotFoundException("Categoría de ingreso no encontrada");
    }
    try {
      return await this.ledger.createRecurringIncomeRule(userId, {
        categoryId: body.categoryId,
        amount: body.amount,
        dayOfMonth: body.dayOfMonth,
        label: body.label,
        notes: body.notes,
        isActive: body.isActive,
      });
    } catch (e) {
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
