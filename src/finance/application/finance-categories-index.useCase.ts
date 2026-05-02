import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { ExpenseCategory } from "src/finance/domain/expense-category";

@Injectable()
export class FinanceCategoriesIndexUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(userId: string): Promise<ExpenseCategory[]> {
    return this.ledger.findExpenseCategoriesByUser(userId);
  }
}
