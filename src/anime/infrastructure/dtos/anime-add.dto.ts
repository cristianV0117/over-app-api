import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { ANIME_WATCH_STATUSES } from "src/shared/infrastructure/mongo/schemas/anime-entry.schema";

export class AnimeAddDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anilistId!: number;

  @IsOptional()
  @IsIn([...ANIME_WATCH_STATUSES])
  watchStatus?: (typeof ANIME_WATCH_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score?: number;
}
