import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const ANIME_WATCH_STATUSES = [
  "watching",
  "completed",
  "planned",
  "dropped",
  "paused",
] as const;
export type AnimeWatchStatus = (typeof ANIME_WATCH_STATUSES)[number];

@Schema({ timestamps: true, collection: "anime_entries" })
export class AnimeEntryModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  anilistId!: number;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: "", trim: true })
  titleEnglish!: string;

  @Prop({ default: "", trim: true })
  titleNative!: string;

  @Prop({ default: "", trim: true })
  coverImage!: string;

  @Prop({ default: "", trim: true })
  bannerImage!: string;

  @Prop({ type: [String], default: [] })
  genres!: string[];

  @Prop({ default: "", trim: true })
  format!: string;

  @Prop({ type: Number, default: null })
  episodes!: number | null;

  @Prop({ type: Number, default: null })
  anilistScore!: number | null;

  @Prop({ default: "", trim: true })
  season!: string;

  @Prop({ type: Number, default: null })
  seasonYear!: number | null;

  @Prop({ default: "", trim: true })
  anilistStatus!: string;

  @Prop({ default: "", trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  studios!: string[];

  @Prop({ default: "", trim: true })
  siteUrl!: string;

  @Prop({ required: true, enum: ANIME_WATCH_STATUSES, default: "planned" })
  watchStatus!: AnimeWatchStatus;

  @Prop({ type: Number, default: null, min: 1, max: 10 })
  score!: number | null;

  @Prop({ type: Number, default: 0, min: 0 })
  watchedEpisodes!: number;

  @Prop({ default: false })
  favorite!: boolean;

  @Prop({ default: "", trim: true, maxlength: 2000 })
  notes!: string;
}

export type AnimeEntryDocument = AnimeEntryModel &
  Document & { createdAt: Date; updatedAt: Date };

export const AnimeEntrySchema = SchemaFactory.createForClass(AnimeEntryModel);

AnimeEntrySchema.index({ userId: 1, anilistId: 1 }, { unique: true });
AnimeEntrySchema.index({ userId: 1, watchStatus: 1, updatedAt: -1 });
AnimeEntrySchema.index({ userId: 1, score: -1 });
AnimeEntrySchema.index({ userId: 1, favorite: 1 });
