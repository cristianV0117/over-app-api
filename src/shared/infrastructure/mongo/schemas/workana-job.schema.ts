import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, collection: "workana_jobs" })
export class WorkanaJobModel {
  @Prop({ required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({ default: "", trim: true })
  authorName!: string;

  @Prop({ default: "", trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ default: "", trim: true })
  budget!: string;

  @Prop({ default: false })
  isHourly!: boolean;

  @Prop({ default: false })
  isUrgent!: boolean;

  @Prop({ default: false })
  hasVerifiedPaymentMethod!: boolean;

  @Prop({ type: Number, default: null })
  totalBids!: number | null;

  @Prop({ default: "", trim: true })
  postedDate!: string;

  @Prop({ default: "", trim: true })
  country!: string;

  @Prop({ default: "", trim: true })
  query!: string;

  @Prop({ required: true, min: 0 })
  score!: number;

  @Prop({ type: [String], default: [] })
  matchedSkills!: string[];

  @Prop({ default: false })
  highlighted!: boolean;

  @Prop({ type: Date, default: null })
  notifiedAt!: Date | null;

  @Prop({ required: true })
  fetchedAt!: Date;
}

export type WorkanaJobDocument = WorkanaJobModel &
  Document & { createdAt: Date; updatedAt: Date };

export const WorkanaJobSchema = SchemaFactory.createForClass(WorkanaJobModel);

WorkanaJobSchema.index({ highlighted: 1, score: -1, fetchedAt: -1 });
WorkanaJobSchema.index({ fetchedAt: -1 });
