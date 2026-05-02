import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceRecurringExpensesDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(ruleId: string, userId: string): Promise<void> {
    const ok = await this.ledger.deleteRecurringExpenseRule(userId, ruleId);
    if (!ok) {
      throw new NotFoundException("Regla recurrente no encontrada");
    }
  }
}
