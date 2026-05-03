import { Inject, Injectable } from "@nestjs/common";
import { TasksRepository } from "../domain/repositories/tasks.repository";

@Injectable()
export class TasksDeleteUseCase {
  constructor(
    @Inject("TasksRepository")
    private readonly tasksRepository: TasksRepository
  ) {}

  execute(taskId: string, userId: string): Promise<boolean> {
    return this.tasksRepository.deleteByUser(taskId, userId);
  }
}
