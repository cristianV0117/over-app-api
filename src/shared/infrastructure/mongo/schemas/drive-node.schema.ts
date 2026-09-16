import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const DRIVE_KINDS = ["folder", "file"] as const;
export type DriveKind = (typeof DRIVE_KINDS)[number];

@Schema({ timestamps: true, collection: "drive_nodes" })
export class DriveNodeModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  parentId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, enum: DRIVE_KINDS })
  kind!: DriveKind;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, required: false, default: null })
  url?: string | null;

  @Prop({ type: String, required: false, default: null })
  mimeType?: string | null;

  @Prop({ type: Number, required: false, default: null, min: 0 })
  size?: number | null;
}

export type DriveNodeDocument = DriveNodeModel &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };

export const DriveNodeSchema = SchemaFactory.createForClass(DriveNodeModel);

DriveNodeSchema.index(
  { userId: 1, parentId: 1, name: 1 },
  { unique: true }
);
