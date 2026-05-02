import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpenseCategoryStoreDto } from "../infrastructure/dtos/finance-expense-category-store.dto";
import { ExpenseCategory } from "src/finance/domain/expense-category";

@Injectable()
export class FinanceCategoriesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceExpenseCategoryStoreDto,
    userId: string
  ): Promise<ExpenseCategory> {
    return this.ledger.createExpenseCategory(userId, body.name);
  }
}
