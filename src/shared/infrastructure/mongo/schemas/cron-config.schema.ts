import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class CronConfigModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ default: false })
  enabled!: boolean;

  @Prop({ default: 5, min: 1, max: 1440 })
  everyMinutes!: number;

  @Prop({ type: Date, default: null })
  lastRunAt!: Date | null;
}

export type CronConfigDocument = CronConfigModel &
  Document & { createdAt: Date; updatedAt: Date };

export const CronConfigSchema = SchemaFactory.createForClass(CronConfigModel);
