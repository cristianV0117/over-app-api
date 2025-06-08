import * as bcrypt from "bcrypt";

export class UsersStoreValueObject {
  constructor(
    private readonly name: string,
    private readonly email: string,
    private password: string | null
  ) {
    this.encriptPassword();
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPassword(): string | null {
    return this.password;
  }

  getStatus(): string {
    return "active";
  }

  private encriptPassword() {
    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    this.password = bcrypt.hashSync(
      this.password || "passwordfromgoogle",
      salt
    );
  }
}
