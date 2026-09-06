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
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { CronJobsService } from "src/cron/application/cron.service";
import { CronController } from "../controllers/cron.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: CronConfigModel.name, schema: CronConfigSchema },
      { name: CronLogModel.name, schema: CronLogSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [CronController],
  providers: [JwtStrategy, JwtAuthGuard, CronJobsService],
})
export class CronModule {}
