import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, collection: "finance_recurring_income_received" })
export class FinanceRecurringIncomeReceivedModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "FinanceRecurringIncomeModel",
    required: true,
  })
  recurringRuleId!: Types.ObjectId;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true, min: 1, max: 12 })
  month!: number;

  @Prop({ default: false })
  received!: boolean;
}

export type FinanceRecurringIncomeReceivedDocument =
  FinanceRecurringIncomeReceivedModel & Document;

export const FinanceRecurringIncomeReceivedSchema =
  SchemaFactory.createForClass(FinanceRecurringIncomeReceivedModel);

FinanceRecurringIncomeReceivedSchema.index(
  { userId: 1, recurringRuleId: 1, year: 1, month: 1 },
  { unique: true }
);
