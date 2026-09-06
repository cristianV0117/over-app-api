import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class CronLogModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: "scheduled" })
  source!: "scheduled" | "manual";
}

export type CronLogDocument = CronLogModel &
  Document & { createdAt: Date; updatedAt: Date };

export const CronLogSchema = SchemaFactory.createForClass(CronLogModel);

CronLogSchema.index({ userId: 1, createdAt: -1 });
