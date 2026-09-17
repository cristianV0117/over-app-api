import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import {
  lastPaymentDateUtc,
  replayDebtPayments,
  simulateDebtPayoff,
  type DebtPayoffInput,
  type DebtPayoffResult,
} from "src/finance/domain/debt-payoff";

@Injectable()
export class FinanceDebtsForecastUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    userId: string,
    extraMonthly = 0,
    debtId?: string
  ): Promise<{
    extraMonthly: number;
    totalBalance: number;
    totalInstallment: number;
    items: Array<
      DebtPayoffResult & {
        id: string;
        creditor: string;
        balance: number;
        installmentAmount: number;
        interestRate: number;
        interestRateType: string;
        dayOfMonth: number;
        paidInstallments: number;
        totalInstallments: number | null;
      }
    >;
  }> {
    const debts = await this.ledger.findDebtsByUser(userId);
    const active = debts.filter((d) => d.toJSON().isActive);
    const selected = debtId
      ? active.filter((d) => d.toJSON().id === debtId)
      : active;
    if (debtId && selected.length === 0) {
      throw new NotFoundException("Crédito no encontrado");
    }

    const extra = Math.max(0, extraMonthly);
    const allPayments = await this.ledger.findDebtPayments(userId);
    const paymentsByDebt = new Map<string, typeof allPayments>();
    for (const payment of allPayments) {
      const list = paymentsByDebt.get(payment.debtId) ?? [];
      list.push(payment);
      paymentsByDebt.set(payment.debtId, list);
    }

    const items = selected.map((row, index) => {
      const j = row.toJSON();
      const recorded = paymentsByDebt.get(j.id) ?? [];
      const opening =
        j.paymentBaseBalance != null ? j.paymentBaseBalance : j.balance;
      const replayed = replayDebtPayments(
        opening,
        j.installmentAmount,
        j.interestRate,
        j.interestRateType,
        recorded.map((p) => ({
          year: p.year,
          month: p.month,
          amount: p.amount,
        }))
      );
      const remaining = recorded.length ? replayed.remaining : j.balance;
      const from = lastPaymentDateUtc(replayed.applied) ?? new Date();
      const input: DebtPayoffInput = {
        name: j.name,
        balance: remaining,
        interestRate: j.interestRate,
        interestRateType: j.interestRateType,
        installmentAmount: j.installmentAmount,
        extraMonthly: selected.length === 1 ? extra : index === 0 ? extra : 0,
      };
      const sim = simulateDebtPayoff(input, from);
      const paidSchedule = replayed.applied.map((step, i) => ({
        month: i + 1,
        date: step.date,
        payment: Math.round(step.amount),
        interest: step.interest,
        principal: step.principal,
        extraPrincipal: step.extraPrincipal,
        paid: true,
        balance: step.balance,
      }));
      const remainingSchedule = sim.schedule.map((step) => ({
        ...step,
        month: paidSchedule.length + step.month,
        paid: false,
      }));
      const paidOff = remaining <= 0.5;
      return {
        ...sim,
        neverPays: paidOff ? false : sim.neverPays,
        payoffDate: paidOff
          ? paidSchedule[paidSchedule.length - 1]?.date ?? sim.payoffDate
          : sim.payoffDate,
        months: sim.months,
        schedule: [...paidSchedule, ...remainingSchedule],
        id: j.id,
        creditor: j.creditor,
        balance: Math.round(remaining),
        installmentAmount: j.installmentAmount,
        interestRate: j.interestRate,
        interestRateType: j.interestRateType,
        dayOfMonth: j.dayOfMonth,
        paidInstallments: recorded.length,
        totalInstallments: j.totalInstallments,
      };
    });

    return {
      extraMonthly: extra,
      totalBalance: items.reduce((s, i) => s + i.balance, 0),
      totalInstallment: items.reduce((s, i) => s + i.installmentAmount, 0),
      items,
    };
  }
}
