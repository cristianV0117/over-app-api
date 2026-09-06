import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class FinanceDebtModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: "" })
  creditor!: string;

  @Prop({ required: true, min: 0 })
  balance!: number;

  @Prop({ default: 0, min: 0 })
  principal!: number;

  @Prop({ required: true, min: 0 })
  interestRate!: number;

  @Prop({ required: true, enum: ["NM", "EA"] })
  interestRateType!: "NM" | "EA";

  @Prop({ required: true, min: 0 })
  installmentAmount!: number;

  @Prop({ required: true, min: 1, max: 31 })
  dayOfMonth!: number;

  @Prop({ type: Number, default: null })
  totalInstallments!: number | null;

  @Prop({ default: 0, min: 0 })
  paidInstallments!: number;

  @Prop({ type: Date, default: null })
  startDate!: Date | null;

  @Prop({ default: "" })
  notes!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export type FinanceDebtDocument = FinanceDebtModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceDebtSchema = SchemaFactory.createForClass(FinanceDebtModel);

FinanceDebtSchema.index({ userId: 1, isActive: 1 });
