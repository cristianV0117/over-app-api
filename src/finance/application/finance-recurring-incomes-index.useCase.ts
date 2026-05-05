import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringIncome } from "src/finance/domain/finance-recurring-income";

@Injectable()
export class FinanceRecurringIncomesIndexUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(userId: string): Promise<FinanceRecurringIncome[]> {
    return this.ledger.findRecurringIncomeRulesByUser(userId);
  }
}
