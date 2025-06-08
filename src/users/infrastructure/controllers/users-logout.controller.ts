import { Controller, Post, Res } from "@nestjs/common";
import { UsersAuthenticatedUseCase } from "src/users/application/users-authenticated.usecase";
import { UsersAuthCookieManager } from "../implementations/cookies/users-auth-cookie.manager";
import { Response } from "express";

@Controller("logout")
export class UsersLogoutController {
  constructor(
    private readonly usersAuthenticatedUseCase: UsersAuthenticatedUseCase
  ) {}

  @Post()
  logout(@Res() response: Response) {
    void this.usersAuthenticatedUseCase.logOut(
      new UsersAuthCookieManager(response)
    );

    return response.status(204).send();
  }
}
