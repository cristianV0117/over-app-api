import { User } from "../user";
import { UsersLoginValueObject } from "../valueObjects/users-login.valueObject";
import { UsersStoreValueObject } from "../valueObjects/users-store.valueObjects";

export interface UsersLoginRepository {
  login(userLogin: UsersLoginValueObject): Promise<User>;
  ensureShow(email: string): Promise<boolean>;
  store(userStore: UsersStoreValueObject): Promise<User>;
  show(email: string): Promise<User>;
}
