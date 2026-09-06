import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class PayLinkModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  url!: string;

  @Prop({ default: "", trim: true, maxlength: 200 })
  notes!: string;
}

export type PayLinkDocument = PayLinkModel &
  Document & { createdAt: Date; updatedAt: Date };

export const PayLinkSchema = SchemaFactory.createForClass(PayLinkModel);

PayLinkSchema.index({ userId: 1, createdAt: -1 });
