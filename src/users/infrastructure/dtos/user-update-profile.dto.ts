import { IsString, IsOptional, MaxLength } from "class-validator";

export class UserUpdateProfileDTO {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
