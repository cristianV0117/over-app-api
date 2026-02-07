import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";

export class TasksStoreDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsMongoId()
  status?: string;
}
