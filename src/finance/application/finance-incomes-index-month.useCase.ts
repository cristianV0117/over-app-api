import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeLine } from "src/finance/domain/finance-income-line";

@Injectable()
export class FinanceIncomesIndexMonthUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceIncomeLine[]> {
    return this.ledger.findIncomesForMonth(userId, year, month);
  }
}
