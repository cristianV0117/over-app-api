import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class FinanceAssistantAttachmentDto {
  @IsIn(["image/jpeg", "image/png", "image/webp", "image/gif"])
  mimeType!: string;

  @IsString()
  @MaxLength(8_000_000)
  dataBase64!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  fileName?: string;
}

export class FinanceAssistantChatDto {
  @IsString()
  @MaxLength(4000)
  message!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FinanceAssistantAttachmentDto)
  attachment?: FinanceAssistantAttachmentDto;
}
