import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { MailService } from "../../../shared/infrastructure/services/mail.service";
import { ForgotPasswordDto } from "../dtos/forgot-password.dto";
import { UsersLoginRepository } from "src/users/domain/repositories/users-login.repository";

@Controller("email")
@UseGuards(ThrottlerGuard)
export class UsersForgotPasswordController {
  constructor(
    private readonly mailService: MailService,
    @Inject("UsersLoginRepository")
    private readonly users: UsersLoginRepository
  ) {}

  @Post("forgot")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgot(@Body() body: ForgotPasswordDto) {
    const exists = await this.users.ensureShow(body.email);
    if (exists) {
      const user = await this.users.show(body.email);
      await this.mailService.forgot(body.email, user.getName());
    }
    return { message: "Correo enviado" };
  }
}
