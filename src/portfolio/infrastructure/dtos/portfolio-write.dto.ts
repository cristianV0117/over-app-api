import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PortfolioThemeDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  background?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accentFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accentTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  muted?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  line?: string;
}

export class PortfolioSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  type!: string;

  @IsOptional()
  order?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  x?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  y?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  w?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  h?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minW?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minH?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class PortfolioWriteDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase alphanumeric with optional hyphens",
  })
  slug!: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PortfolioThemeDto)
  theme?: PortfolioThemeDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioSectionDto)
  sections?: PortfolioSectionDto[];
}
