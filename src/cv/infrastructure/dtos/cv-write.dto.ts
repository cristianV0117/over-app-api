import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CvThemeDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sidebarBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sidebarText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sidebarMuted?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  pageBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  heading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  chipBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  chipText?: string;
}

export class CvHeaderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;
}

export class CvSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  type!: string;

  @IsIn(["sidebar", "main"])
  column!: "sidebar" | "main";

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CvWriteDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(["es", "en"])
  locale?: "es" | "en";

  @IsOptional()
  @ValidateNested()
  @Type(() => CvThemeDto)
  theme?: CvThemeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CvHeaderDto)
  header?: CvHeaderDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvSectionDto)
  sections?: CvSectionDto[];
}
