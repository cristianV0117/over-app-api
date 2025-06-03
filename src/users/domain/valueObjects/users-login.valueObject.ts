export class UsersLoginValueObject {
  constructor(
    private readonly email: string,
    private readonly password: string
  ) {}

  getEmail(): string {
    return this.email;
  }

  getPassword(): string {
    return this.password;
  }
}
