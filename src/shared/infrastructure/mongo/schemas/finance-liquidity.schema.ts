import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ _id: false })
export class FinanceLiquidityAccountModel {
  @Prop({ required: true, trim: true })
  label!: string;

  /** Saldo actual en COP */
  @Prop({ required: true, min: 0 })
  amount!: number;
}

const FinanceLiquidityAccountSchema = SchemaFactory.createForClass(
  FinanceLiquidityAccountModel
);

@Schema({ timestamps: true, collection: "finance_liquidity" })
export class FinanceLiquidityModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: [FinanceLiquidityAccountSchema], default: [] })
  accounts!: FinanceLiquidityAccountModel[];
}

export type FinanceLiquidityDocument = FinanceLiquidityModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const FinanceLiquiditySchema =
  SchemaFactory.createForClass(FinanceLiquidityModel);
