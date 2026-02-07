import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../../../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { TaskStatusModel } from "../schemas/task-status.schema";
import { Model } from "mongoose";

const TASK_STATUSES = [
  { name: "To Do" },
  { name: "In Progress" },
  { name: "Done" },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const taskStatusModel = app.get<Model<TaskStatusModel>>(
    getModelToken("TaskStatusModel")
  );

  const existing = await taskStatusModel.countDocuments();

  if (existing === 0) {
    await taskStatusModel.insertMany(TASK_STATUSES);
    console.log("✅ Task statuses seeded: To Do, In Progress, Done.");
  } else {
    console.log("⚠️ Task statuses already exist, skipped.");
  }

  await app.close();
}
bootstrap();
