import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { IncomeCategory } from "src/finance/domain/income-category";

@Injectable()
export class FinanceIncomeCategoriesIndexUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(userId: string): Promise<IncomeCategory[]> {
    return this.ledger.findIncomeCategoriesByUser(userId);
  }
}
