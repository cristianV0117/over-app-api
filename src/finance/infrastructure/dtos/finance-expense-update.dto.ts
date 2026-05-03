import {
  IsDate,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class FinanceExpenseUpdateDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}
