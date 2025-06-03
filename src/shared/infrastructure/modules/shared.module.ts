import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "../mongo/schemas/user.schema";
import { StatusModel, StatusSchema } from "../mongo/schemas/status.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: StatusModel.name, schema: StatusSchema },
    ]),
  ],
  controllers: [],
})
export class SharedModule {}
