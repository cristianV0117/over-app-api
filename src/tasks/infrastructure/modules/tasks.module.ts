import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import { TaskModel, TaskSchema } from "src/shared/infrastructure/mongo/schemas/task.schema";
import {
  TaskStatusModel,
  TaskStatusSchema,
} from "src/shared/infrastructure/mongo/schemas/task-status.schema";
import { TasksStoreController } from "../controllers/tasks.store.controller";
import { TaskStatusController } from "../controllers/task-status.controller";
import { TasksStoreUseCase } from "src/tasks/application/tasks.store.useCase";
import { TasksIndexUseCase } from "src/tasks/application/tasks.index.useCase";
import { TasksUpdateStatusUseCase } from "src/tasks/application/tasks-update-status.useCase";
import { TasksImplementation } from "../implementations/mongo/tasks.implementation";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskModel.name, schema: TaskSchema },
      { name: TaskStatusModel.name, schema: TaskStatusSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [TasksStoreController, TaskStatusController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    TasksStoreUseCase,
    TasksIndexUseCase,
    TasksUpdateStatusUseCase,
    {
      provide: "TasksRepository",
      useClass: TasksImplementation,
    },
  ],
})
export class TasksModule { }