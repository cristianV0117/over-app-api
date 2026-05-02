import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class FinanceMonthQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
