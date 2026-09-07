import { Type } from "class-transformer";
import { IsMongoId, IsNumber, IsOptional, Max, Min } from "class-validator";

export class FinanceDebtForecastQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50_000_000)
  extraMonthly?: number;

  @IsOptional()
  @IsMongoId()
  debtId?: string;
}
