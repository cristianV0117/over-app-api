import { Inject, Injectable } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceLiquidityPutDto } from "../infrastructure/dtos/finance-liquidity-put.dto";

@Injectable()
export class FinanceLiquidityReplaceUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  execute(userId: string, body: FinanceLiquidityPutDto) {
    return this.ledger.replaceLiquidityAccounts(userId, body.accounts);
  }
}
