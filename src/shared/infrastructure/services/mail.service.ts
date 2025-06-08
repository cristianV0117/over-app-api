import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async forgot(to: string, name: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password`;
    await this.mailerService.sendMail({
      to,
      subject: "¡Recuperar contraseña!",
      template: "",
      html: `
        <div style="background-color:#121212;padding:40px 20px;font-family:sans-serif;color:#ffffff;text-align:center;">
          <div style="max-width:500px;margin:auto;background-color:#1B1F22;padding:30px;border-radius:10px;">
            <h1 style="color:#A259FF;font-size:28px;margin-bottom:10px;">OVER APP</h1>
            <h2 style="margin:20px 0;">Hola ${name}</h2>
            <p style="color:#ccc;">Haz clic en el botón para restablecer tu contraseña.</p>
            <a href="${resetUrl}" 
              style="display:inline-block;margin-top:20px;padding:12px 24px;background-color:#702CF4;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
              Restablecer contraseña
            </a>
            <p style="margin-top:30px;font-size:12px;color:#777;">
              Si no solicitaste este correo, puedes ignorarlo.
            </p>
          </div>
        </div>
      `,
    });
  }
}
