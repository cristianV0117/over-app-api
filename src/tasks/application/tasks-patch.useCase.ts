import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TasksRepository } from "../domain/repositories/tasks.repository";
import { TaskPatchDTO } from "../infrastructure/dtos/task-patch.dto";
import { Task } from "../domain/task";

@Injectable()
export class TasksPatchUseCase {
  constructor(
    @Inject("TasksRepository")
    private readonly tasksRepository: TasksRepository
  ) {}

  async execute(
    taskId: string,
    userId: string,
    body: TaskPatchDTO
  ): Promise<Task> {
    const keys = Object.keys(body).filter(
      (k) => body[k as keyof TaskPatchDTO] !== undefined
    );
    if (keys.length === 0) {
      const tasks = await this.tasksRepository.findAllByUserId(userId);
      const found = tasks.find((t) => t.toJSON().id === taskId);
      if (!found) throw new NotFoundException("Tarea no encontrada");
      return found;
    }
    const updated = await this.tasksRepository.updateFields(taskId, userId, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      priority: body.priority,
    });
    if (!updated) throw new NotFoundException("Tarea no encontrada");
    return updated;
  }
}
