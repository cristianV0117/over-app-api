import { Task } from "../task";
import { TaskStoreValueObject } from "../valueObjects/task.store.valueObject";

export interface TasksRepository {
  store(task: TaskStoreValueObject): Promise<Task>;
  findAllByUserId(userId: string): Promise<Task[]>;
  updateStatus(
    taskId: string,
    userId: string,
    statusId: string
  ): Promise<Task | null>;
  updateFields(
    taskId: string,
    userId: string,
    patch: {
      title?: string;
      description?: string;
      dueDate?: Date;
      priority?: string;
    }
  ): Promise<Task | null>;
  deleteByUser(taskId: string, userId: string): Promise<boolean>;
}