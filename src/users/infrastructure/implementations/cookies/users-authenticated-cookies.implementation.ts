import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  AuthCookieManager,
  UsersAuthenticatedRepository,
} from "src/users/domain/repositories/users-authenticated.repository";
import { User } from "src/users/domain/user";
import { UserLogin } from "src/users/domain/user-login";

@Injectable()
export class UsersAuthenticatedCookiesImplementation
  implements UsersAuthenticatedRepository
{
  constructor(private readonly jwtService: JwtService) {}

  async logout(response: AuthCookieManager): Promise<void> {
    await Promise.resolve(response.clearAuthCookie());
  }

  authenticated(user: User, response: AuthCookieManager): UserLogin {
    const token = this.jwtService.sign(
      {
        sub: user.getId(),
        email: user.getEmail(),
        name: user.getName(),
      },
      { secret: process.env.JWT_SECRET || "secretKey" }
    );
    response.createAuthCookie(token);
    return new UserLogin({
      email: user.getEmail(),
      token: token,
      password: "",
      name: user.getName(),
    });
  }
}
