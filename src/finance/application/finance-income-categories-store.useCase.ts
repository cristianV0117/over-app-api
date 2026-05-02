import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeCategoryStoreDto } from "../infrastructure/dtos/finance-income-category-store.dto";
import { IncomeCategory } from "src/finance/domain/income-category";

@Injectable()
export class FinanceIncomeCategoriesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceIncomeCategoryStoreDto,
    userId: string
  ): Promise<IncomeCategory> {
    return this.ledger.createIncomeCategory(userId, body.name);
  }
}
