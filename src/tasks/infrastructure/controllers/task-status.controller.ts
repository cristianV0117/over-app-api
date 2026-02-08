import { Controller, Get, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TaskStatusModel, TaskStatusDocument } from "src/shared/infrastructure/mongo/schemas/task-status.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";

@Controller("task-statuses")
export class TaskStatusController {
  constructor(
    @InjectModel(TaskStatusModel.name)
    private readonly taskStatusModel: Model<TaskStatusDocument>
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async index() {
    const list = await this.taskStatusModel.find().lean().exec();
    return list.map((s) => ({
      id: String(s._id),
      name: s.name,
    }));
  }
}
