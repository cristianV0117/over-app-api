import { Task } from "../task";
import { TaskStoreValueObject } from "../valueObjects/task.store.valueObject";

export interface TasksRepository {
  store(task: TaskStoreValueObject): Promise<Task>;
  findAllByUserId(userId: string): Promise<Task[]>;
}