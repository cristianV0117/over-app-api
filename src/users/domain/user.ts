import { UserDto } from "./dtos/user-dto";

export class User {
  constructor(protected props: UserDto) {}

  toJSON() {
    return {
      id: this.getId(),
      name: this.getName(),
      email: this.getEmail(),
      createdAt: this.getCreatedAt(),
      updatedAt: this.getUpdatedAt(),
    };
  }

  public getId(): string | undefined {
    return this.props.id;
  }

  public getName(): string | undefined {
    return this.props.name;
  }

  public getEmail(): string | undefined {
    return this.props.email;
  }

  public getCreatedAt(): Date | undefined {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
