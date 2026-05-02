import { ExpenseCategoryProps } from "./dtos/expense-category.dto";

export class ExpenseCategory {
  constructor(protected props: ExpenseCategoryProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      name: this.props.name,
    };
  }
}
