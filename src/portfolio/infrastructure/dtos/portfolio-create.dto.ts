import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class PortfolioCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase alphanumeric with optional hyphens",
  })
  slug?: string;
}
