import { UserLogin } from "../user-login";
import { UsersLoginValueObject } from "../valueObjects/users-login.valueObject";

export interface UsersLoginRepository {
  login(userLogin: UsersLoginValueObject): Promise<UserLogin>;
}
