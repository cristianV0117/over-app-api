import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  IsDateString,
} from "class-validator";
import { VEHICLE_TYPES } from "src/shared/infrastructure/mongo/schemas/vehicle.schema";

const MAX_YEAR = new Date().getFullYear() + 1;

export class VehicleCreateDto {
  @IsIn(VEHICLE_TYPES)
  type!: "moto" | "carro";

  @IsString()
  @MinLength(3)
  @MaxLength(12)
  plate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(MAX_YEAR)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  soatExpiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  technoExpiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  licenseExpiresAt?: string | null;
}

export class VehicleUpdateDto {
  @IsOptional()
  @IsIn(VEHICLE_TYPES)
  type?: "moto" | "carro";

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(12)
  plate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(MAX_YEAR)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  soatExpiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  technoExpiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsDateString()
  licenseExpiresAt?: string | null;
}
