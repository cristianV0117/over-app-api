import { User } from "../user";
import { UserLogin } from "../user-login";

export interface UsersAuthenticatedRepository {
  authenticated(user: User): Promise<UserLogin>;
  logout(respone: AuthCookieManager): Promise<void>;
}

export interface AuthCookieManager {
  clearAuthCookie(): void;
}
