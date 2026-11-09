import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { GAME_PLAY_STATUSES } from "src/shared/infrastructure/mongo/schemas/game-entry.schema";

export class GameAddDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  steamId!: number;

  @IsOptional()
  @IsIn([...GAME_PLAY_STATUSES])
  playStatus?: (typeof GAME_PLAY_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score?: number;
}
