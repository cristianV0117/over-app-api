import { TasksStoreDTO } from "../infrastructure/dtos/tasks.store.dto";
import { TasksRepository } from "../domain/repositories/tasks.repository";
import { Task } from "../domain/task";
import { Inject } from "@nestjs/common";
import { TaskStoreValueObject } from "../domain/valueObjects/task.store.valueObject";

export class TasksStoreUseCase {
  constructor(
    @Inject("TasksRepository")
    private readonly tasksRepository: TasksRepository
  ) { }

  async execute(task: TasksStoreDTO, userId: string): Promise<Task> {
    const valueObject = new TaskStoreValueObject(
      task.title,
      userId,
      task.status,
      task.description,
      task.dueDate,
      task.priority
    );
    return this.tasksRepository.store(valueObject);
  }
}
