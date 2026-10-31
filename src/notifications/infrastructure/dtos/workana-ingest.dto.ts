import { Allow, IsOptional, IsString } from "class-validator";

export class WorkanaIngestDto {
  @Allow()
  results?: unknown;

  @IsOptional()
  @IsString()
  query?: string;
}
