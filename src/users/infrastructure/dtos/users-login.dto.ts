import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class UserLoginDTO {
  @ApiProperty()
  @IsEmail({}, { message: "El email no es válido" })
  email!: string;

  @ApiProperty()
  @IsString({ message: "La contraseña debe ser texto" })
  password!: string;
}

export class UserRegisterDTO {
  @ApiProperty()
  @IsString({ message: "El nombre debe ser texto" })
  @MinLength(2, { message: "El nombre debe tener al menos 2 caracteres" })
  name!: string;

  @ApiProperty()
  @IsEmail({}, { message: "El email no es válido" })
  email!: string;

  @ApiProperty()
  @IsString({ message: "La contraseña debe ser texto" })
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password!: string;
}

export class LoginResponseDTO {
  @ApiProperty()
  email!: string | undefined;

  @ApiProperty()
  token!: string | undefined;
}
