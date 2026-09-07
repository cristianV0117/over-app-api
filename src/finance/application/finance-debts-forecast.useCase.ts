import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import {
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
    const items = selected.map((row, index) => {
      const j = row.toJSON();
      const input: DebtPayoffInput = {
        name: j.name,
        balance: j.balance,
        interestRate: j.interestRate,
        interestRateType: j.interestRateType,
        installmentAmount: j.installmentAmount,
        extraMonthly: selected.length === 1 ? extra : index === 0 ? extra : 0,
      };
      const sim = simulateDebtPayoff(input);
      return {
        ...sim,
        id: j.id,
        creditor: j.creditor,
        balance: j.balance,
        installmentAmount: j.installmentAmount,
        interestRate: j.interestRate,
        interestRateType: j.interestRateType,
        dayOfMonth: j.dayOfMonth,
        paidInstallments: j.paidInstallments,
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
