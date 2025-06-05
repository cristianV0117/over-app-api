import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";

@Controller("me")
export class UsersMeController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile(@Req() req: RequestWithUser) {
    return req.user; // ahora tipado correctamente
  }
}
