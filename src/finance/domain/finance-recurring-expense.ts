import { FinanceRecurringExpenseProps } from "./dtos/finance-recurring-expense.dto";

export class FinanceRecurringExpense {
  constructor(protected props: FinanceRecurringExpenseProps) {}

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      categoryId: this.props.categoryId,
      categoryName: this.props.categoryName,
      amount: this.props.amount,
      dayOfMonth: this.props.dayOfMonth,
      label: this.props.label,
      notes: this.props.notes,
      isActive: this.props.isActive,
    };
  }
}
