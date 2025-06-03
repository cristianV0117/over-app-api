import { Exceptions } from "src/shared/domain/exceptions/exceptions";

export class UsersInvalidCredentialsException extends Exceptions {
  constructor() {
    super("Invalid credentials");
    this.name = "UsersInvalidCredentialsException";
  }
}
