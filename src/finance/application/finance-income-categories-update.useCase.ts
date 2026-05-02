import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeCategoryUpdateDto } from "../infrastructure/dtos/finance-income-category-update.dto";
import { IncomeCategory } from "src/finance/domain/income-category";

@Injectable()
export class FinanceIncomeCategoriesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    categoryId: string,
    body: FinanceIncomeCategoryUpdateDto,
    userId: string
  ): Promise<IncomeCategory | null> {
    return this.ledger.updateIncomeCategory(userId, categoryId, body.name);
  }
}
