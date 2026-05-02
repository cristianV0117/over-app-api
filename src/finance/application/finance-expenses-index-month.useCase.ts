import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpense } from "src/finance/domain/finance-expense";

@Injectable()
export class FinanceExpensesIndexMonthUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceExpense[]> {
    return this.ledger.findExpensesForMonth(userId, year, month);
  }
}
