import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceRecurringExpense } from "src/finance/domain/finance-recurring-expense";

@Injectable()
export class FinanceRecurringExpensesIndexUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(userId: string): Promise<FinanceRecurringExpense[]> {
    return this.ledger.findRecurringExpenseRulesByUser(userId);
  }
}
