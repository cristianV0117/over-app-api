import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class UserModel {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: Types.ObjectId, ref: "StatusModel", required: true })
  status!: Types.ObjectId;

  @Prop({ type: String, default: null })
  avatarUrl?: string | null;
}

export type UserDocument = UserModel &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const UserSchema = SchemaFactory.createForClass(UserModel);
