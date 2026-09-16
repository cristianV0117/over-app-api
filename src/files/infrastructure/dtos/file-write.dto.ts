import { Transform } from "class-transformer";
import {
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

function emptyToNull(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  return value;
}

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  parentId?: string | null;
}

export class RenameNodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
