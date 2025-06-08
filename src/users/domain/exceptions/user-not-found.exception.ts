import { Exceptions } from "src/shared/domain/exceptions/exceptions";

export class UserNotFoundException extends Exceptions {
  constructor(email: string) {
    super(`User with email ${email} not found`);
    this.name = "ProductNotFoundException";
  }
}
