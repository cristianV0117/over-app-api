import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { UsersLoginUseCase } from "src/users/application/users-login.usecase";

@Controller("auth/google")
export class UsersLoginGoogleController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersLoginUseCase: UsersLoginUseCase
  ) {}

  @Get()
  @UseGuards(AuthGuard("google"))
  async googleLogin() {
    // Redirige a Google
  }

  @Get("callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req, @Res() res: Response) {
    const userRequest = req.user;

    const user = await this.usersLoginUseCase.loginGoogle(
      userRequest.name,
      userRequest.email
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/google-callback?token=${user.getToken()}`
    );
  }
}
