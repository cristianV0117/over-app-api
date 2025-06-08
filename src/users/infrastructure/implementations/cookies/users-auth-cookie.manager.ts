// infrastructure/services/express-auth-cookie.manager.ts
import { AuthCookieManager } from "src/users/domain/repositories/users-authenticated.repository";
import { Response } from "express";

export class UsersAuthCookieManager implements AuthCookieManager {
  constructor(private readonly response: Response) {}

  clearAuthCookie(): void {
    this.response.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }
}
