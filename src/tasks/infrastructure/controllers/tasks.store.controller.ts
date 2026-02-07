import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { TasksStoreDTO } from "../dtos/tasks.store.dto";
import { TasksStoreUseCase } from "src/tasks/application/tasks.store.useCase";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";

@Controller("tasks")
export class TasksStoreController {
  constructor(private readonly tasksStoreUseCase: TasksStoreUseCase) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async store(@Body() body: TasksStoreDTO, @Req() req: RequestWithUser) {
    return this.tasksStoreUseCase.execute(body, req.user.id);
  }
}
