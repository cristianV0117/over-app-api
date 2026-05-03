import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, collection: "finance_recurring_expense_paid" })
export class FinanceRecurringExpensePaidModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "FinanceRecurringExpenseModel",
    required: true,
  })
  recurringRuleId!: Types.ObjectId;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true, min: 1, max: 12 })
  month!: number;

  @Prop({ default: false })
  paid!: boolean;
}

export type FinanceRecurringExpensePaidDocument = FinanceRecurringExpensePaidModel &
  Document;

export const FinanceRecurringExpensePaidSchema = SchemaFactory.createForClass(
  FinanceRecurringExpensePaidModel
);

FinanceRecurringExpensePaidSchema.index(
  { userId: 1, recurringRuleId: 1, year: 1, month: 1 },
  { unique: true }
);
