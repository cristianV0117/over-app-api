import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "../mongo/schemas/user.schema";
import { StatusModel, StatusSchema } from "../mongo/schemas/status.schema";
import {
  LoginLogModel,
  LoginLogSchema,
} from "../mongo/schemas/login-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: StatusModel.name, schema: StatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: LoginLogModel.name, schema: LoginLogSchema },
    ]),
  ],
  controllers: [],
})
export class SharedModule {}
