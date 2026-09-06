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
} from "class-validator";

export class CronConfigPutDto {
  @Type(() => Boolean)
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsIn(["interval", "cron"])
  scheduleType?: "interval" | "cron";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  everyMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cronExpression?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  randomDelayMaxSeconds?: number;
}
