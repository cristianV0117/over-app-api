import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class FinanceLiquidityAccountDto {
  @ApiProperty({ example: "Cuenta banco" })
  @IsString()
  @MinLength(1, { message: "Cada cuenta debe tener un nombre" })
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: 7_000_000 })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class FinanceLiquidityPutDto {
  @ApiProperty({ type: [FinanceLiquidityAccountDto] })
  @IsArray()
  @ArrayMaxSize(50, { message: "Máximo 50 cuentas" })
  @ValidateNested({ each: true })
  @Type(() => FinanceLiquidityAccountDto)
  accounts!: FinanceLiquidityAccountDto[];
}
