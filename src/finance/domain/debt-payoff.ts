import type { FinanceInterestRateType } from "./dtos/finance-debt.dto";

export type DebtPayoffInput = {
  name: string;
  balance: number;
  interestRate: number;
  interestRateType: FinanceInterestRateType;
  installmentAmount: number;
  extraMonthly?: number;
};

export type DebtPayoffResult = {
  name: string;
  months: number;
  neverPays: boolean;
  payoffDate: string | null;
  totalPaid: number;
  totalInterest: number;
  extraMonthly: number;
  monthlyRate: number;
};

/** Tasa mensual en decimal (ej. 0.018). NM = % mensual; EA = % efectiva anual. */
export function monthlyRateFrom(
  rate: number,
  type: FinanceInterestRateType
): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  if (type === "NM") return rate / 100;
  return Math.pow(1 + rate / 100, 1 / 12) - 1;
}

function addMonthsYmd(base: Date, months: number): string {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1)
  );
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function simulateDebtPayoff(
  input: DebtPayoffInput,
  from = new Date()
): DebtPayoffResult {
  const extra = Math.max(0, input.extraMonthly ?? 0);
  const pmt = input.installmentAmount + extra;
  const r = monthlyRateFrom(input.interestRate, input.interestRateType);
  let balance = Math.max(0, input.balance);
  let months = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  const maxMonths = 600;

  if (balance <= 0) {
    return {
      name: input.name,
      months: 0,
      neverPays: false,
      payoffDate: addMonthsYmd(from, 0),
      totalPaid: 0,
      totalInterest: 0,
      extraMonthly: extra,
      monthlyRate: r,
    };
  }

  if (pmt <= 0) {
    return {
      name: input.name,
      months: 0,
      neverPays: true,
      payoffDate: null,
      totalPaid: 0,
      totalInterest: 0,
      extraMonthly: extra,
      monthlyRate: r,
    };
  }

  while (balance > 0.5 && months < maxMonths) {
    const interest = balance * r;
    let principal = pmt - interest;
    if (principal <= 0) {
      return {
        name: input.name,
        months,
        neverPays: true,
        payoffDate: null,
        totalPaid: Math.round(totalPaid),
        totalInterest: Math.round(totalInterest),
        extraMonthly: extra,
        monthlyRate: r,
      };
    }
    if (principal > balance) principal = balance;
    const paid = principal + interest;
    balance -= principal;
    totalPaid += paid;
    totalInterest += interest;
    months += 1;
  }

  return {
    name: input.name,
    months,
    neverPays: balance > 0.5,
    payoffDate: balance > 0.5 ? null : addMonthsYmd(from, months),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
    extraMonthly: extra,
    monthlyRate: r,
  };
}

export type DebtPlanStrategy = "avalanche" | "snowball";

export function simulateDebtPlan(
  debts: DebtPayoffInput[],
  extraBudget: number,
  strategy: DebtPlanStrategy
): {
  strategy: DebtPlanStrategy;
  extraBudget: number;
  items: DebtPayoffResult[];
} {
  const sorted = [...debts].sort((a, b) => {
    if (strategy === "avalanche") {
      const ra = monthlyRateFrom(a.interestRate, a.interestRateType);
      const rb = monthlyRateFrom(b.interestRate, b.interestRateType);
      return rb - ra;
    }
    return a.balance - b.balance;
  });
  const extra = Math.max(0, extraBudget);
  const items = sorted.map((d, i) =>
    simulateDebtPayoff({
      ...d,
      extraMonthly: i === 0 ? extra : 0,
    })
  );
  return { strategy, extraBudget: extra, items };
}
