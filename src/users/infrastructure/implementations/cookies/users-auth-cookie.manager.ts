import { AuthCookieManager } from "src/users/domain/repositories/users-authenticated.repository";
import { Response } from "express";

export class UsersAuthCookieManager implements AuthCookieManager {
  constructor(private readonly response: Response) {}

  createAuthCookie(token: string): void {
    this.response.cookie("token", token, {
      httpOnly: true,
      secure: process.env.PROD == "true" ? true : false,
      sameSite: process.env.PROD == "true" ? "none" : "lax",
    });
  }

  clearAuthCookie(): void {
    this.response.clearCookie("token", {
      httpOnly: true,
      secure: process.env.PROD == "true" ? true : false,
      sameSite: process.env.PROD == "true" ? "none" : "lax",
    });
  }
}
