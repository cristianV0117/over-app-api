import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class FinanceDebtStoreDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  creditor?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  balance!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principal?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate!: number;

  @IsIn(["NM", "EA"])
  interestRateType!: "NM" | "EA";

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  installmentAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalInstallments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidInstallments?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
