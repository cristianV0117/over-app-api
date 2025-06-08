import { User } from "../user";
import { UserLogin } from "../user-login";

export interface UsersAuthenticatedRepository {
  authenticated(user: User, respone: AuthCookieManager): UserLogin;
  logout(respone: AuthCookieManager): Promise<void>;
}

export interface AuthCookieManager {
  createAuthCookie(token: string): void;
  clearAuthCookie(): void;
}
