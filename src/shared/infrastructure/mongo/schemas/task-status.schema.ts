import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TaskStatusModel {
  @Prop({ required: true, unique: true })
  name!: string;
}

export type TaskStatusDocument = TaskStatusModel & Document;
export const TaskStatusSchema = SchemaFactory.createForClass(TaskStatusModel);
