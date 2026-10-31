import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  NotificationModel,
  NotificationSchema,
} from "src/shared/infrastructure/mongo/schemas/notification.schema";
import {
  WorkanaJobModel,
  WorkanaJobSchema,
} from "src/shared/infrastructure/mongo/schemas/workana-job.schema";
import {
  FinanceDebtModel,
  FinanceDebtSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-debt.schema";
import {
  FinanceDebtPaymentModel,
  FinanceDebtPaymentSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-debt-payment.schema";
import {
  FinanceRecurringExpenseModel,
  FinanceRecurringExpenseSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense.schema";
import {
  FinanceRecurringExpensePaidModel,
  FinanceRecurringExpensePaidSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense-paid.schema";
import {
  FinanceRecurringIncomeModel,
  FinanceRecurringIncomeSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-income.schema";
import {
  TaskModel,
  TaskSchema,
} from "src/shared/infrastructure/mongo/schemas/task.schema";
import {
  TaskStatusModel,
  TaskStatusSchema,
} from "src/shared/infrastructure/mongo/schemas/task-status.schema";
import {
  VehicleModel,
  VehicleSchema,
} from "src/shared/infrastructure/mongo/schemas/vehicle.schema";
import {
  CronConfigModel,
  CronConfigSchema,
} from "src/shared/infrastructure/mongo/schemas/cron-config.schema";
import {
  CronLogModel,
  CronLogSchema,
} from "src/shared/infrastructure/mongo/schemas/cron-log.schema";
import {
  UserModel,
  UserSchema,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import {
  StatusModel,
  StatusSchema,
} from "src/shared/infrastructure/mongo/schemas/status.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { UsersLoginMongoImplementation } from "src/users/infrastructure/implementations/mongo/users-login-mongo.implementation";
import { NotificationsService } from "../../application/notifications.service";
import { NotificationsScanService } from "../../application/notifications-scan.service";
import { WorkanaService } from "../../application/workana.service";
import { NotificationsController } from "../controllers/notifications.controller";
import { WorkanaController } from "../controllers/workana.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: NotificationModel.name, schema: NotificationSchema },
      { name: WorkanaJobModel.name, schema: WorkanaJobSchema },
      { name: FinanceDebtModel.name, schema: FinanceDebtSchema },
      { name: FinanceDebtPaymentModel.name, schema: FinanceDebtPaymentSchema },
      {
        name: FinanceRecurringExpenseModel.name,
        schema: FinanceRecurringExpenseSchema,
      },
      {
        name: FinanceRecurringExpensePaidModel.name,
        schema: FinanceRecurringExpensePaidSchema,
      },
      {
        name: FinanceRecurringIncomeModel.name,
        schema: FinanceRecurringIncomeSchema,
      },
      { name: TaskModel.name, schema: TaskSchema },
      { name: TaskStatusModel.name, schema: TaskStatusSchema },
      { name: VehicleModel.name, schema: VehicleSchema },
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
  controllers: [NotificationsController, WorkanaController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    NotificationsService,
    NotificationsScanService,
    WorkanaService,
    {
      provide: "UsersLoginRepository",
      useClass: UsersLoginMongoImplementation,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
