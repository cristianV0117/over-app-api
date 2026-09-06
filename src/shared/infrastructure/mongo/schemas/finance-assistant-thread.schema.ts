import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FinanceAssistantMessageRole = "user" | "assistant";

@Schema({ _id: false })
export class FinanceAssistantMessageModel {
  @Prop({ required: true, enum: ["user", "assistant"] })
  role!: FinanceAssistantMessageRole;

  @Prop({ required: true })
  content!: string;

  @Prop({ default: "" })
  attachmentName!: string;

  @Prop({ type: Object, default: null })
  extractedDebt!: Record<string, unknown> | null;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

const FinanceAssistantMessageSchema = SchemaFactory.createForClass(
  FinanceAssistantMessageModel
);

@Schema({ timestamps: true })
export class FinanceAssistantThreadModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: [FinanceAssistantMessageSchema], default: [] })
  messages!: FinanceAssistantMessageModel[];
}

export type FinanceAssistantThreadDocument = FinanceAssistantThreadModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceAssistantThreadSchema = SchemaFactory.createForClass(
  FinanceAssistantThreadModel
);
