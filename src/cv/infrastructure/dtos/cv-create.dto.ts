import { IsOptional, IsString, MaxLength } from "class-validator";

export class CvCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
