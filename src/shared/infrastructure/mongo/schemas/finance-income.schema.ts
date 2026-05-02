import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceIncomeModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "FinanceIncomeCategoryModel",
    required: true,
  })
  categoryId!: Types.ObjectId;

  /** Monto en COP */
  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  receivedAt!: Date;

  @Prop({ default: "" })
  notes!: string;
}

export type FinanceIncomeDocument = FinanceIncomeModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceIncomeSchema =
  SchemaFactory.createForClass(FinanceIncomeModel);

FinanceIncomeSchema.index({ userId: 1, receivedAt: -1 });
