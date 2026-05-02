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

export class FinanceExpenseStoreDto {
  @IsMongoId()
  categoryId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
