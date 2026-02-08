import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export type TaskPriorityDto = (typeof TASK_PRIORITIES)[number];

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

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriorityDto;
}
