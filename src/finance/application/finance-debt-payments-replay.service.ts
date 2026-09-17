import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  replayDebtPayments,
  type AppliedDebtPayment,
} from "src/finance/domain/debt-payoff";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceDebtPaymentsReplayService {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async persist(userId: string, debtId: string): Promise<{
    remaining: number;
    applied: AppliedDebtPayment[];
  }> {
    const debt = await this.ledger.findDebtById(userId, debtId);
    if (!debt) throw new NotFoundException("Crédito no encontrado");
    const json = debt.toJSON();
    const payments = await this.ledger.findDebtPayments(userId, debtId);

    const opening =
      json.paymentBaseBalance != null
        ? json.paymentBaseBalance
        : json.balance;

    const replayed = replayDebtPayments(
      opening,
      json.installmentAmount,
      json.interestRate,
      json.interestRateType,
      payments.map((p) => ({
        year: p.year,
        month: p.month,
        amount: p.amount,
      }))
    );

    for (const row of replayed.applied) {
      await this.ledger.updateDebtPaymentBreakdown(
        userId,
        debtId,
        row.year,
        row.month,
        {
          interestPortion: row.interest,
          principalPortion: row.principal,
          extraPrincipal: row.extraPrincipal,
        }
      );
    }

    await this.ledger.updateDebt(userId, debtId, {
      balance: Math.round(replayed.remaining),
      paidInstallments: replayed.applied.length,
      paymentBaseBalance: replayed.applied.length ? opening : null,
    });

    return {
      remaining: replayed.remaining,
      applied: replayed.applied,
    };
  }
}
