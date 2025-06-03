import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "./shared/infrastructure/modules/shared.module";
import { UsersModule } from "./users/infrastructure/modules/users.module";

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://localhost:27017/over-app", {
      dbName: "over-app",
    }),
    SharedModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
