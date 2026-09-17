import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, collection: "finance_debt_payments" })
export class FinanceDebtPaymentModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "FinanceDebtModel", required: true })
  debtId!: Types.ObjectId;

  @Prop({ type: Number, required: true })
  year!: number;

  @Prop({ type: Number, required: true, min: 1, max: 12 })
  month!: number;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, default: 0 })
  interestPortion!: number;

  @Prop({ type: Number, default: 0 })
  principalPortion!: number;

  @Prop({ type: Number, default: 0 })
  extraPrincipal!: number;
}

export type FinanceDebtPaymentDocument = FinanceDebtPaymentModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceDebtPaymentSchema = SchemaFactory.createForClass(
  FinanceDebtPaymentModel
);

FinanceDebtPaymentSchema.index(
  { userId: 1, debtId: 1, year: 1, month: 1 },
  { unique: true }
);
