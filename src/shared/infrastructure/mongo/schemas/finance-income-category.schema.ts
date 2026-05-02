import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceIncomeCategoryModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;
}

export type FinanceIncomeCategoryDocument = FinanceIncomeCategoryModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceIncomeCategorySchema = SchemaFactory.createForClass(
  FinanceIncomeCategoryModel
);

FinanceIncomeCategorySchema.index({ userId: 1, name: 1 });
