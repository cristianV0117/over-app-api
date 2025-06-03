import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class StatusModel {
  @Prop({ required: true })
  name!: string;
}

export type StatusDocument = StatusModel & Document;
export const StatusSchema = SchemaFactory.createForClass(StatusModel);
