import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CvSectionType =
  | "about"
  | "personal"
  | "links"
  | "education"
  | "skills"
  | "languages"
  | "courses"
  | "experience"
  | "custom";

export type CvColumn = "sidebar" | "main";

@Schema({ _id: false })
export class CvThemeModel {
  @Prop({ default: "#4A1830" })
  sidebarBg!: string;

  @Prop({ default: "#FFFFFF" })
  sidebarText!: string;

  @Prop({ default: "#E8D0D8" })
  sidebarMuted!: string;

  @Prop({ default: "#E8C9A8" })
  accent!: string;

  @Prop({ default: "#F7F4F1" })
  pageBg!: string;

  @Prop({ default: "#3D1528" })
  heading!: string;

  @Prop({ default: "#2C2426" })
  body!: string;

  @Prop({ default: "#6B2A44" })
  chipBg!: string;

  @Prop({ default: "#FFFFFF" })
  chipText!: string;
}

@Schema({ _id: false })
export class CvHeaderModel {
  @Prop({ default: "" })
  fullName!: string;

  @Prop({ default: "" })
  role!: string;

  @Prop({ default: "" })
  location!: string;

  @Prop({ default: "" })
  phone!: string;

  @Prop({ default: "" })
  email!: string;
}

@Schema({ _id: false })
export class CvSectionModel {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  type!: CvSectionType;

  @Prop({ required: true, default: "sidebar" })
  column!: CvColumn;

  @Prop({ required: true, default: 0 })
  order!: number;

  @Prop({ default: true })
  visible!: boolean;

  @Prop({ default: "" })
  title!: string;

  @Prop({ type: Object, default: {} })
  config!: Record<string, unknown>;
}

@Schema({ timestamps: true, collection: "cvs" })
export class CvModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ trim: true, maxlength: 80, default: "Mi CV" })
  name!: string;

  @Prop({ default: "es", enum: ["es", "en"] })
  locale!: "es" | "en";

  @Prop({ type: Types.ObjectId, ref: "CvModel", default: null })
  translatedFromId!: Types.ObjectId | null;

  @Prop({ type: CvThemeModel, default: () => ({}) })
  theme!: CvThemeModel;

  @Prop({ type: CvHeaderModel, default: () => ({}) })
  header!: CvHeaderModel;

  @Prop({ type: [CvSectionModel], default: [] })
  sections!: CvSectionModel[];
}

export type CvDocument = CvModel & Document & { createdAt: Date; updatedAt: Date };

export const CvSchema = SchemaFactory.createForClass(CvModel);

CvSchema.index({ userId: 1, updatedAt: -1 });
