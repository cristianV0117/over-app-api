import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class LoginLogModel {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  from!: string;

  @Prop({ required: true })
  loginAt!: Date;
}

export type LoginLogDocument = LoginLogModel & Document;
export const LoginLogSchema = SchemaFactory.createForClass(LoginLogModel);
