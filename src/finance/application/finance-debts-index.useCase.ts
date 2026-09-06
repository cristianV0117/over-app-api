import { Inject, Injectable } from "@nestjs/common";
import { FinanceDebt } from "src/finance/domain/finance-debt";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceDebtsIndexUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(userId: string): Promise<FinanceDebt[]> {
    return this.ledger.findDebtsByUser(userId);
  }
}
