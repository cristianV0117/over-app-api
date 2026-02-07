import { Inject, Injectable } from "@nestjs/common";
import { TasksRepository } from "../domain/repositories/tasks.repository";
import { Task } from "../domain/task";

@Injectable()
export class TasksIndexUseCase {
  constructor(
    @Inject("TasksRepository")
    private readonly tasksRepository: TasksRepository
  ) { }

  async execute(userId: string): Promise<Task[]> {
    return this.tasksRepository.findAllByUserId(userId);
  }
}
