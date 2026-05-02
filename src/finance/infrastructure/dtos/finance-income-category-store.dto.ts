import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class FinanceIncomeCategoryStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
