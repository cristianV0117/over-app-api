import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PortfolioSectionType =
  | "hero"
  | "text"
  | "list"
  | "accordion"
  | "embed"
  | "github"
  | "image"
  | "button"
  | "button_group"
  | "project"
  | "contact"
  /** legacy */
  | "about"
  | "experience"
  | "projects"
  | "github_stats"
  | "custom";

@Schema({ _id: false })
export class PortfolioThemeModel {
  @Prop({ default: "#060608" })
  background!: string;

  @Prop({ default: "#6b2fb8" })
  accentFrom!: string;

  @Prop({ default: "#c94b6d" })
  accentTo!: string;

  @Prop({ default: "rgba(255,255,255,0.62)" })
  muted!: string;

  @Prop({ default: "rgba(255,255,255,0.06)" })
  line!: string;
}

@Schema({ _id: false })
export class PortfolioSectionModel {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  type!: PortfolioSectionType;

  @Prop({ required: true, default: 0 })
  order!: number;

  @Prop({ default: 0 })
  x!: number;

  @Prop({ default: 0 })
  y!: number;

  @Prop({ default: 12 })
  w!: number;

  @Prop({ default: 4 })
  h!: number;

  @Prop({ default: 2 })
  minW!: number;

  @Prop({ default: 2 })
  minH!: number;

  @Prop({ type: Object, default: {} })
  config!: Record<string, unknown>;
}

@Schema({ timestamps: true })
export class PortfolioModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ trim: true, maxlength: 80, default: "Mi portafolio" })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 40 })
  slug!: string;

  @Prop({ default: false })
  published!: boolean;

  @Prop({ type: PortfolioThemeModel, default: () => ({}) })
  theme!: PortfolioThemeModel;

  @Prop({ type: [PortfolioSectionModel], default: [] })
  sections!: PortfolioSectionModel[];
}

export type PortfolioDocument = PortfolioModel &
  Document & { createdAt: Date; updatedAt: Date };

export const PortfolioSchema = SchemaFactory.createForClass(PortfolioModel);

PortfolioSchema.index({ slug: 1 }, { unique: true });
PortfolioSchema.index({ userId: 1, updatedAt: -1 });
