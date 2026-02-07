import { TasksStoreDTO } from "src/tasks/infrastructure/dtos/tasks.store.dto";
import { Task } from "../task";
import { TaskStoreValueObject } from "../valueObjects/task.store.valueObject";

export interface TasksRepository {
  store(task: TaskStoreValueObject): Promise<Task>;
}