// src/users/infrastructure/controllers/users-google.controller.ts
import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";

@Controller("auth/google")
export class UsersLoginGoogleController {
  constructor(private readonly jwtService: JwtService) {}

  @Get()
  @UseGuards(AuthGuard("google"))
  async googleLogin() {
    // Redirige a Google
  }

  @Get("callback")
  @UseGuards(AuthGuard("google"))
  googleCallback(@Req() req, @Res() res: Response) {
    const user = req.user;

    const token = this.jwtService.sign(
      {
        sub: 1,
        email: user.email,
        name: user.name,
      },
      { secret: process.env.JWT_SECRET || "secretKey" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.PROD == "true",
      sameSite: process.env.PROD == "true" ? "none" : "lax",
    });

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }
}
