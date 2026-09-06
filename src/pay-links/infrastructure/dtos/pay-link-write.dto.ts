import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class PayLinkWriteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsUrl({ require_protocol: true, protocols: ["http", "https"] })
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
