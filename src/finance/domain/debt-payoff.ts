import type { FinanceInterestRateType } from "./dtos/finance-debt.dto";

export type DebtPayoffInput = {
  name: string;
  balance: number;
  interestRate: number;
  interestRateType: FinanceInterestRateType;
  installmentAmount: number;
  extraMonthly?: number;
};

export type DebtPayoffStep = {
  month: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  extraPrincipal: number;
  paid: boolean;
  balance: number;
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
  schedule: DebtPayoffStep[];
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

  const schedule: DebtPayoffStep[] = [];

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
      schedule,
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
      schedule,
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
        schedule,
      };
    }
    if (principal > balance) principal = balance;
    const paid = principal + interest;
    balance -= principal;
    totalPaid += paid;
    totalInterest += interest;
    months += 1;
    schedule.push({
      month: months,
      date: addMonthsYmd(from, months),
      payment: Math.round(paid),
      interest: Math.round(interest),
      principal: Math.round(principal),
      extraPrincipal: Math.round(extra),
      paid: false,
      balance: Math.round(Math.max(0, balance)),
    });
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
    schedule,
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

export type RecordedDebtPayment = {
  year: number;
  month: number;
  amount: number;
};

export type AppliedDebtPayment = RecordedDebtPayment & {
  date: string;
  interest: number;
  principal: number;
  extraPrincipal: number;
  balance: number;
};

export function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function applyDebtPaymentStep(
  balance: number,
  amount: number,
  monthlyRate: number,
  installmentAmount: number
): {
  interest: number;
  principal: number;
  extraPrincipal: number;
  newBalance: number;
} {
  const interest = Math.max(0, balance) * monthlyRate;
  let principal = amount - interest;
  if (principal > balance) principal = balance;
  const newBalance = Math.max(0, balance - principal);
  const extraPrincipal = Math.max(0, amount - installmentAmount);
  return { interest, principal, extraPrincipal, newBalance };
}

export function replayDebtPayments(
  openingBalance: number,
  installmentAmount: number,
  interestRate: number,
  interestRateType: FinanceInterestRateType,
  payments: RecordedDebtPayment[]
): { remaining: number; monthlyRate: number; applied: AppliedDebtPayment[] } {
  const monthlyRate = monthlyRateFrom(interestRate, interestRateType);
  const sorted = [...payments].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
  let balance = Math.max(0, openingBalance);
  const applied: AppliedDebtPayment[] = [];
  for (const payment of sorted) {
    const step = applyDebtPaymentStep(
      balance,
      payment.amount,
      monthlyRate,
      installmentAmount
    );
    balance = step.newBalance;
    applied.push({
      year: payment.year,
      month: payment.month,
      amount: payment.amount,
      date: yearMonthKey(payment.year, payment.month),
      interest: Math.round(step.interest),
      principal: Math.round(step.principal),
      extraPrincipal: Math.round(step.extraPrincipal),
      balance: Math.round(Math.max(0, balance)),
    });
  }
  return { remaining: Math.max(0, balance), monthlyRate, applied };
}

export function lastPaymentDateUtc(payments: AppliedDebtPayment[]): Date | null {
  if (!payments.length) return null;
  const last = payments[payments.length - 1];
  return new Date(Date.UTC(last.year, last.month - 1, 1));
}
