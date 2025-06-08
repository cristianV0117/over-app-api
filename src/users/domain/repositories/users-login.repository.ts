import { User } from "../user";
import { UsersLoginValueObject } from "../valueObjects/users-login.valueObject";

export interface UsersLoginRepository {
  login(userLogin: UsersLoginValueObject): Promise<User>;
}
