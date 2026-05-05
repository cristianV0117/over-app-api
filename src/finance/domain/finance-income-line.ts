import { FinanceIncomeLineProps } from "./dtos/finance-income-line.dto";

export class FinanceIncomeLine {
  constructor(protected props: FinanceIncomeLineProps) {}

  get categoryId(): string {
    return this.props.categoryId;
  }

  get amount(): number {
    return this.props.amount;
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      categoryId: this.props.categoryId,
      categoryName: this.props.categoryName,
      amount: this.props.amount,
      receivedAt: this.props.receivedAt,
      notes: this.props.notes ?? "",
      label: this.props.label,
      isRecurring: this.props.isRecurring ?? false,
      recurringRuleId: this.props.recurringRuleId,
      received: this.props.received ?? true,
    };
  }
}
