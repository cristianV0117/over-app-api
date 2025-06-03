import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class UserLoginDTO {
  @ApiProperty()
  @IsEmail({}, { message: "El email no es válido" })
  email!: string;

  @ApiProperty()
  @IsString({ message: "La contraseña debe ser texto" })
  password!: string;
}

export class LoginResponseDTO {
  @ApiProperty()
  email!: string | undefined;

  @ApiProperty()
  token!: string | undefined;
}
