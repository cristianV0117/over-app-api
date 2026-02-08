import { User } from "../user";
import { UsersLoginValueObject } from "../valueObjects/users-login.valueObject";
import { UsersStoreValueObject } from "../valueObjects/users-store.valueObjects";

export interface UsersProfileUpdate {
  name?: string;
  avatarUrl?: string | null;
}

export interface UsersLoginRepository {
  login(userLogin: UsersLoginValueObject): Promise<User>;
  ensureShow(email: string): Promise<boolean>;
  store(userStore: UsersStoreValueObject): Promise<User>;
  show(email: string): Promise<User>;
  findById(id: string): Promise<User | null>;
  updateProfile(userId: string, data: UsersProfileUpdate): Promise<User | null>;
}
