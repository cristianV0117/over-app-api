import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class FinanceExportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  fromYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  fromMonth!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  toYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  toMonth!: number;

  @IsOptional()
  @IsIn(["csv", "json"])
  format?: "csv" | "json";
}
