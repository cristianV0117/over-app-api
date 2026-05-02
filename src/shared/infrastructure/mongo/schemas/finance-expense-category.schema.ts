import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceExpenseCategoryModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;
}

export type FinanceExpenseCategoryDocument = FinanceExpenseCategoryModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceExpenseCategorySchema = SchemaFactory.createForClass(
  FinanceExpenseCategoryModel
);

FinanceExpenseCategorySchema.index({ userId: 1, name: 1 });
