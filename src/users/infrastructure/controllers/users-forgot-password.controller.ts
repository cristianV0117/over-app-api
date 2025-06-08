import { Controller, Post, Body } from "@nestjs/common";
import { MailService } from "../../../shared/infrastructure/services/mail.service";

@Controller("email")
export class UsersForgotPasswordController {
  constructor(private readonly mailService: MailService) {}

  @Post("forgot")
  async forgot(@Body() body: { email: string; name: string }) {
    await this.mailService.forgot(body.email, body.name);
    return { message: "Correo enviado" };
  }
}
