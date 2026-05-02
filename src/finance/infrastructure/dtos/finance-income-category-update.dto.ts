import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class FinanceIncomeCategoryUpdateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
