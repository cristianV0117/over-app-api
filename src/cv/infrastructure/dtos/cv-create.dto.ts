import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CvHeaderDto, CvSectionDto, CvThemeDto } from "./cv-write.dto";

export class CvCreateDto {
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
