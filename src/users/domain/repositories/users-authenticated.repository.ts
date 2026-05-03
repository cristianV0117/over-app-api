import { User } from "../user";
import { UserLogin } from "../user-login";

export interface UsersAuthenticatedRepository {
  authenticated(user: User): Promise<UserLogin>;
  /** Token con claim `imp` (admin que inició la sesión). */
  impersonated(user: User, impersonatorId: string): Promise<UserLogin>;
  logout(respone: AuthCookieManager): Promise<void>;
}

export interface AuthCookieManager {
  createAuthCookie(token: string): void;
  clearAuthCookie(): void;
}
