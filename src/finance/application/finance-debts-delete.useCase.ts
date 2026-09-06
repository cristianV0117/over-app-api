import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceDebtsDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const ok = await this.ledger.deleteDebt(userId, id);
    if (!ok) throw new NotFoundException("Deuda no encontrada");
  }
}
