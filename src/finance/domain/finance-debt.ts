import { FinanceDebtProps } from "./dtos/finance-debt.dto";

export class FinanceDebt {
  constructor(protected props: FinanceDebtProps) {}

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      name: this.props.name,
      creditor: this.props.creditor,
      balance: this.props.balance,
      principal: this.props.principal,
      interestRate: this.props.interestRate,
      interestRateType: this.props.interestRateType,
      installmentAmount: this.props.installmentAmount,
      dayOfMonth: this.props.dayOfMonth,
      totalInstallments: this.props.totalInstallments,
      paidInstallments: this.props.paidInstallments,
      startDate: this.props.startDate,
      notes: this.props.notes,
      isActive: this.props.isActive,
    };
  }
}
