import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AdminImpersonateDto {
  @ApiProperty({ description: "ID del usuario a visualizar (no puede ser otro admin)" })
  @IsString()
  @IsNotEmpty({ message: "userId requerido" })
  userId!: string;
}
