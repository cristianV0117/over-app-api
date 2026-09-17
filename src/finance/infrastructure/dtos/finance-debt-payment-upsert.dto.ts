import { Type } from "class-transformer";
import { IsInt, IsNumber, Max, Min } from "class-validator";

export class FinanceDebtPaymentUpsertDto {
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

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;
}
