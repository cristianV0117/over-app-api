import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from "@nestjs/common";
import { TasksStoreDTO } from "../dtos/tasks.store.dto";
import { TaskUpdateStatusDTO } from "../dtos/task-update-status.dto";
import { TasksStoreUseCase } from "src/tasks/application/tasks.store.useCase";
import { TasksIndexUseCase } from "src/tasks/application/tasks.index.useCase";
import { TasksUpdateStatusUseCase } from "src/tasks/application/tasks-update-status.useCase";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";

@Controller("tasks")
export class TasksStoreController {
  constructor(
    private readonly tasksStoreUseCase: TasksStoreUseCase,
    private readonly tasksIndexUseCase: TasksIndexUseCase,
    private readonly tasksUpdateStatusUseCase: TasksUpdateStatusUseCase
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async index(@Req() req: RequestWithUser) {
    const tasks = await this.tasksIndexUseCase.execute(req.user.id);
    return tasks.map((t) => t.toJSON());
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async store(@Body() body: TasksStoreDTO, @Req() req: RequestWithUser) {
    const task = await this.tasksStoreUseCase.execute(body, req.user.id);
    return task.toJSON();
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param("id") taskId: string,
    @Body() body: TaskUpdateStatusDTO,
    @Req() req: RequestWithUser
  ) {
    const task = await this.tasksUpdateStatusUseCase.execute(
      taskId,
      req.user.id,
      body.status
    );
    if (!task) throw new NotFoundException("Tarea no encontrada");
    return task.toJSON();
  }
}
