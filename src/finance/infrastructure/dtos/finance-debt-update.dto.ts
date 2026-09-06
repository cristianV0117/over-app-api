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

export class FinanceDebtUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  creditor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  balance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsIn(["NM", "EA"])
  interestRateType?: "NM" | "EA";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalInstallments?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidInstallments?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
