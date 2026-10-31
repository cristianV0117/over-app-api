import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { ANIME_WATCH_STATUSES } from "src/shared/infrastructure/mongo/schemas/anime-entry.schema";

export class AnimeUpdateDto {
  @IsOptional()
  @IsIn([...ANIME_WATCH_STATUSES])
  watchStatus?: (typeof ANIME_WATCH_STATUSES)[number];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchedEpisodes?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
