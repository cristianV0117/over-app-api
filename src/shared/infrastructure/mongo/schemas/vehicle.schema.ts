import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const VEHICLE_TYPES = ["moto", "carro"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_DOC_KINDS = [
  "soat",
  "tecnomecanica",
  "tarjetaPropiedad",
  "licencia",
  "manual",
] as const;
export type VehicleDocKind = (typeof VEHICLE_DOC_KINDS)[number];

@Schema({ _id: false })
export class VehicleDocumentFile {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  uploadedAt!: Date;
}

const VehicleDocumentFileSchema =
  SchemaFactory.createForClass(VehicleDocumentFile);

@Schema({ _id: false })
export class VehicleDocuments {
  @Prop({ type: VehicleDocumentFileSchema, required: false })
  soat?: VehicleDocumentFile;

  @Prop({ type: VehicleDocumentFileSchema, required: false })
  tecnomecanica?: VehicleDocumentFile;

  @Prop({ type: VehicleDocumentFileSchema, required: false })
  tarjetaPropiedad?: VehicleDocumentFile;

  @Prop({ type: VehicleDocumentFileSchema, required: false })
  licencia?: VehicleDocumentFile;

  @Prop({ type: VehicleDocumentFileSchema, required: false })
  manual?: VehicleDocumentFile;
}

const VehicleDocumentsSchema = SchemaFactory.createForClass(VehicleDocuments);

@Schema({ timestamps: true })
export class VehicleModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: VEHICLE_TYPES })
  type!: VehicleType;

  @Prop({ required: true, trim: true, uppercase: true, maxlength: 12 })
  plate!: string;

  @Prop({ default: "", trim: true, maxlength: 80 })
  brand!: string;

  @Prop({ default: "", trim: true, maxlength: 80 })
  model!: string;

  @Prop({ required: false })
  year?: number;

  @Prop({ default: "", trim: true, maxlength: 40 })
  color!: string;

  @Prop({ default: "", trim: true, maxlength: 400 })
  notes!: string;

  @Prop({ required: false, min: 0, max: 2_000_000 })
  odometerKm?: number | null;

  @Prop({ required: false, min: 0, max: 40 })
  yearsOwned?: number | null;

  @Prop({ required: false, type: Date })
  soatExpiresAt?: Date | null;

  @Prop({ required: false, type: Date })
  technoExpiresAt?: Date | null;

  @Prop({ required: false, type: Date })
  licenseExpiresAt?: Date | null;

  @Prop({ type: VehicleDocumentsSchema, default: () => ({}) })
  documents!: VehicleDocuments;
}

export type VehicleDocument = VehicleModel &
  Document & { createdAt: Date; updatedAt: Date };

export const VehicleSchema = SchemaFactory.createForClass(VehicleModel);

VehicleSchema.index({ userId: 1, createdAt: -1 });
