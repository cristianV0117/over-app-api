export type FinanceInterestRateType = "NM" | "EA";

export type FinanceDebtProps = {
  id: string;
  userId: string;
  name: string;
  creditor: string;
  balance: number;
  principal: number;
  interestRate: number;
  interestRateType: FinanceInterestRateType;
  installmentAmount: number;
  dayOfMonth: number;
  totalInstallments: number | null;
  paidInstallments: number;
  startDate: Date | null;
  notes: string;
  isActive: boolean;
};
