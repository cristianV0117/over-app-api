import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { GAME_PLAY_STATUSES } from "src/shared/infrastructure/mongo/schemas/game-entry.schema";

export class GameUpdateDto {
  @IsOptional()
  @IsIn([...GAME_PLAY_STATUSES])
  playStatus?: (typeof GAME_PLAY_STATUSES)[number];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursPlayed?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
