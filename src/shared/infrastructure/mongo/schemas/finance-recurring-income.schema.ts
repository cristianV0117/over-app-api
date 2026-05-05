import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceRecurringIncomeModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "FinanceIncomeCategoryModel",
    required: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  /** Día del mes (1–31); si el mes es más corto, se usa el último día */
  @Prop({ required: true, min: 1, max: 31 })
  dayOfMonth!: number;

  @Prop({ default: "" })
  label!: string;

  @Prop({ default: "" })
  notes!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export type FinanceRecurringIncomeDocument = FinanceRecurringIncomeModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceRecurringIncomeSchema = SchemaFactory.createForClass(
  FinanceRecurringIncomeModel
);

FinanceRecurringIncomeSchema.index({ userId: 1, isActive: 1 });
