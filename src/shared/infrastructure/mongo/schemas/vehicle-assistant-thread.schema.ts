import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ _id: false })
export class VehicleAssistantMessageModel {
  @Prop({ required: true, enum: ["user", "assistant"] })
  role!: "user" | "assistant";

  @Prop({ required: true })
  content!: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

const VehicleAssistantMessageSchema = SchemaFactory.createForClass(
  VehicleAssistantMessageModel
);

@Schema({ timestamps: true })
export class VehicleAssistantThreadModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "VehicleModel", required: true })
  vehicleId!: Types.ObjectId;

  @Prop({ type: [VehicleAssistantMessageSchema], default: [] })
  messages!: VehicleAssistantMessageModel[];
}

export type VehicleAssistantThreadDocument = VehicleAssistantThreadModel &
  Document & { createdAt: Date; updatedAt: Date };

export const VehicleAssistantThreadSchema = SchemaFactory.createForClass(
  VehicleAssistantThreadModel
);

VehicleAssistantThreadSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });
