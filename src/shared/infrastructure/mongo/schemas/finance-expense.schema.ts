import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceExpenseModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "FinanceExpenseCategoryModel",
    required: true,
  })
  categoryId!: Types.ObjectId;

  /** Monto en COP */
  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  occurredAt!: Date;

  @Prop({ default: "" })
  notes!: string;
}

export type FinanceExpenseDocument = FinanceExpenseModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceExpenseSchema =
  SchemaFactory.createForClass(FinanceExpenseModel);

FinanceExpenseSchema.index({ userId: 1, occurredAt: -1 });
