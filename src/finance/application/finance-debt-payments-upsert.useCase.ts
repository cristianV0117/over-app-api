import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceDebtPaymentsReplayService } from "./finance-debt-payments-replay.service";

@Injectable()
export class FinanceDebtPaymentsUpsertUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository,
    private readonly replay: FinanceDebtPaymentsReplayService
  ) {}

  async execute(
    userId: string,
    debtId: string,
    year: number,
    month: number,
    amount: number
  ) {
    const debt = await this.ledger.findDebtById(userId, debtId);
    if (!debt) throw new NotFoundException("Crédito no encontrado");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("El pago debe ser mayor a 0");
    }

    const json = debt.toJSON();
    const existing = await this.ledger.findDebtPayments(userId, debtId);
    if (existing.length === 0 && json.paymentBaseBalance == null) {
      await this.ledger.updateDebt(userId, debtId, {
        paymentBaseBalance: json.balance,
      });
    }

    await this.ledger.upsertDebtPayment(userId, debtId, year, month, amount);
    const replayed = await this.replay.persist(userId, debtId);
    const updated = await this.ledger.findDebtById(userId, debtId);
    return {
      debt: updated?.toJSON() ?? json,
      remaining: Math.round(replayed.remaining),
      payments: replayed.applied,
    };
  }
}
