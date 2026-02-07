import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class TaskModel {
  @Prop({ required: true })
  title!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ type: Types.ObjectId, ref: "TaskStatusModel", required: true })
  status!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop()
  dueDate?: Date;

  @Prop({ default: 0 })
  order!: number;
}

export type TaskDocument = TaskModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const TaskSchema = SchemaFactory.createForClass(TaskModel);