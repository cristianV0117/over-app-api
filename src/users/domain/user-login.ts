import { UserLoginDto } from "./dtos/user-dto";
import { User } from "./user";

export class UserLogin extends User {
  private propsLogin: UserLoginDto;

  constructor(props: UserLoginDto) {
    super(props);
    this.propsLogin = props;
  }

  public getName(): string {
    return this.propsLogin.name;
  }

  public getEmail(): string {
    return this.propsLogin.email;
  }

  public getToken(): string {
    return this.propsLogin.token;
  }
}
