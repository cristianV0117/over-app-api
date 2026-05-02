import {
  IsDate,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class FinanceIncomeUpdateDto {
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
  receivedAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
