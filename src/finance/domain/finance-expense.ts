import { FinanceExpenseProps } from "./dtos/finance-expense.dto";

export class FinanceExpense {
  constructor(protected props: FinanceExpenseProps) {}

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
      occurredAt: this.props.occurredAt,
      notes: this.props.notes ?? "",
      label: this.props.label,
      isRecurring: this.props.isRecurring ?? false,
      recurringRuleId: this.props.recurringRuleId,
    };
  }
}
