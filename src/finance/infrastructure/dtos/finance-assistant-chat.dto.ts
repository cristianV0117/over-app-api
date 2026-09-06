import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const ATTACHMENT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/octet-stream",
] as const;

export class FinanceAssistantAttachmentDto {
  @IsIn(ATTACHMENT_MIMES)
  mimeType!: string;

  @IsString()
  @MaxLength(12_000_000)
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => FinanceAssistantAttachmentDto)
  attachments?: FinanceAssistantAttachmentDto[];
}
