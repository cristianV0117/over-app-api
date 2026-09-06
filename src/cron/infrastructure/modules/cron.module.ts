import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  CronConfigModel,
  CronConfigSchema,
} from "src/shared/infrastructure/mongo/schemas/cron-config.schema";
import {
  CronLogModel,
  CronLogSchema,
} from "src/shared/infrastructure/mongo/schemas/cron-log.schema";
import {
  StatusModel,
  StatusSchema,
} from "src/shared/infrastructure/mongo/schemas/status.schema";
import {
  UserModel,
  UserSchema,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { UsersLoginMongoImplementation } from "src/users/infrastructure/implementations/mongo/users-login-mongo.implementation";
import { CronJobsService } from "src/cron/application/cron.service";
import { CronController } from "../controllers/cron.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: CronConfigModel.name, schema: CronConfigSchema },
      { name: CronLogModel.name, schema: CronLogSchema },
      { name: UserModel.name, schema: UserSchema },
      { name: StatusModel.name, schema: StatusSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [CronController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    CronJobsService,
    {
      provide: "UsersLoginRepository",
      useClass: UsersLoginMongoImplementation,
    },
  ],
})
export class CronModule {}
