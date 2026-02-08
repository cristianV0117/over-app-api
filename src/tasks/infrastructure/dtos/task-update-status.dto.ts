import { IsMongoId } from "class-validator";

export class TaskUpdateStatusDTO {
  @IsMongoId()
  status!: string;
}
