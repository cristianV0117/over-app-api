import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "debt",
  "recurring_expense",
  "recurring_income",
  "task",
  "vehicle",
  "cron",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_SEVERITIES = ["info", "warning", "urgent"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

@Schema({ timestamps: true, collection: "notifications" })
export class NotificationModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @Prop({ required: true, enum: NOTIFICATION_SEVERITIES, default: "info" })
  severity!: NotificationSeverity;

  @Prop({ required: true, trim: true, maxlength: 180 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 800 })
  body!: string;

  @Prop({ default: "", trim: true, maxlength: 300 })
  href!: string;

  @Prop({ required: true, trim: true, maxlength: 180 })
  dedupeKey!: string;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  @Prop({ type: Object, default: () => ({}) })
  meta!: Record<string, unknown>;
}

export type NotificationDocument = NotificationModel &
  Document & { createdAt: Date; updatedAt: Date };

export const NotificationSchema =
  SchemaFactory.createForClass(NotificationModel);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
