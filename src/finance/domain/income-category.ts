import { IncomeCategoryProps } from "./dtos/income-category.dto";

export class IncomeCategory {
  constructor(protected props: IncomeCategoryProps) {}

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
