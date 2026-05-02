import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeStoreDto } from "../infrastructure/dtos/finance-income-store.dto";
import { FinanceIncomeLine } from "src/finance/domain/finance-income-line";

@Injectable()
export class FinanceIncomesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceIncomeStoreDto,
    userId: string
  ): Promise<FinanceIncomeLine> {
    const categories = await this.ledger.findIncomeCategoriesByUser(userId);
    if (!categories.some((c) => c.id === body.categoryId)) {
      throw new NotFoundException("Categoría de ingreso no encontrada");
    }
    return this.ledger.createIncome(
      userId,
      body.categoryId,
      body.amount,
      body.receivedAt,
      body.notes
    );
  }
}
