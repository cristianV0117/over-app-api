import { Inject, Injectable } from "@nestjs/common";
import { TasksRepository } from "../domain/repositories/tasks.repository";
import { Task } from "../domain/task";

@Injectable()
export class TasksUpdateStatusUseCase {
  constructor(
    @Inject("TasksRepository")
    private readonly tasksRepository: TasksRepository
  ) { }

  async execute(
    taskId: string,
    userId: string,
    statusId: string
  ): Promise<Task | null> {
    return this.tasksRepository.updateStatus(taskId, userId, statusId);
  }
}
