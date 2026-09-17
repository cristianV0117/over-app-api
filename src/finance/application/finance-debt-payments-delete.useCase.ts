import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceDebtPaymentsReplayService } from "./finance-debt-payments-replay.service";

@Injectable()
export class FinanceDebtPaymentsDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository,
    private readonly replay: FinanceDebtPaymentsReplayService
  ) {}

  async execute(
    userId: string,
    debtId: string,
    year: number,
    month: number
  ) {
    const debt = await this.ledger.findDebtById(userId, debtId);
    if (!debt) throw new NotFoundException("Crédito no encontrado");

    const deleted = await this.ledger.deleteDebtPayment(
      userId,
      debtId,
      year,
      month
    );
    if (!deleted) throw new NotFoundException("Pago no encontrado");

    const remainingPayments = await this.ledger.findDebtPayments(userId, debtId);
    if (remainingPayments.length === 0) {
      const json = debt.toJSON();
      const opening = json.paymentBaseBalance ?? json.balance;
      await this.ledger.updateDebt(userId, debtId, {
        balance: Math.round(opening),
        paidInstallments: 0,
        paymentBaseBalance: null,
      });
      return {
        debt: (await this.ledger.findDebtById(userId, debtId))?.toJSON() ?? json,
        remaining: Math.round(opening),
        payments: [],
      };
    }

    const replayed = await this.replay.persist(userId, debtId);
    const updated = await this.ledger.findDebtById(userId, debtId);
    return {
      debt: updated?.toJSON() ?? debt.toJSON(),
      remaining: Math.round(replayed.remaining),
      payments: replayed.applied,
    };
  }
}
