import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail({}, { message: "El email no es válido" })
  email!: string;
}
