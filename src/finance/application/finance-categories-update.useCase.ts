import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpenseCategoryUpdateDto } from "../infrastructure/dtos/finance-expense-category-update.dto";
import { ExpenseCategory } from "src/finance/domain/expense-category";

@Injectable()
export class FinanceCategoriesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    categoryId: string,
    body: FinanceExpenseCategoryUpdateDto,
    userId: string
  ): Promise<ExpenseCategory | null> {
    return this.ledger.updateExpenseCategory(userId, categoryId, body.name);
  }
}
