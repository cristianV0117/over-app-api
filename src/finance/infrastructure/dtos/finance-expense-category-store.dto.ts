import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class FinanceExpenseCategoryStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
