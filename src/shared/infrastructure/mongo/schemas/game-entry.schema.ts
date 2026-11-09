import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const GAME_PLAY_STATUSES = [
  "playing",
  "completed",
  "planned",
  "dropped",
  "paused",
] as const;
export type GamePlayStatus = (typeof GAME_PLAY_STATUSES)[number];

@Schema({ timestamps: true, collection: "game_entries" })
export class GameEntryModel {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  rawgId!: number;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: "", trim: true })
  coverImage!: string;

  @Prop({ default: "", trim: true })
  bannerImage!: string;

  @Prop({ type: [String], default: [] })
  genres!: string[];

  @Prop({ type: [String], default: [] })
  platforms!: string[];

  @Prop({ type: Number, default: null })
  rawgScore!: number | null;

  @Prop({ type: Number, default: null })
  metacritic!: number | null;

  @Prop({ default: "", trim: true })
  released!: string;

  @Prop({ default: "", trim: true })
  rawgStatus!: string;

  @Prop({ default: "", trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  developers!: string[];

  @Prop({ default: "", trim: true })
  siteUrl!: string;

  @Prop({ type: Number, default: null })
  playtime!: number | null;

  @Prop({ required: true, enum: GAME_PLAY_STATUSES, default: "planned" })
  playStatus!: GamePlayStatus;

  @Prop({ type: Number, default: null, min: 1, max: 10 })
  score!: number | null;

  @Prop({ type: Number, default: 0, min: 0 })
  hoursPlayed!: number;

  @Prop({ default: false })
  favorite!: boolean;

  @Prop({ default: "", trim: true, maxlength: 2000 })
  notes!: string;
}

export type GameEntryDocument = GameEntryModel &
  Document & { createdAt: Date; updatedAt: Date };

export const GameEntrySchema = SchemaFactory.createForClass(GameEntryModel);

GameEntrySchema.index({ userId: 1, rawgId: 1 }, { unique: true });
GameEntrySchema.index({ userId: 1, playStatus: 1, updatedAt: -1 });
GameEntrySchema.index({ userId: 1, score: -1 });
GameEntrySchema.index({ userId: 1, favorite: 1 });
