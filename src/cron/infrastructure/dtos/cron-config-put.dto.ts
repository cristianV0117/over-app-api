import { Type } from "class-transformer";
import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class CronConfigPutDto {
  @Type(() => Boolean)
  @IsBoolean()
  enabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  everyMinutes!: number;
}
