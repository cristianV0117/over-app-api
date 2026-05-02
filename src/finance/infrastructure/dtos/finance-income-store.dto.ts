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

export class FinanceIncomeStoreDto {
  @IsMongoId()
  categoryId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @Type(() => Date)
  @IsDate()
  receivedAt!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
