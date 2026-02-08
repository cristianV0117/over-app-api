import { TasksRepository } from "src/tasks/domain/repositories/tasks.repository";
import { Task } from "src/tasks/domain/task";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TaskModel,
  TaskDocument,
} from "src/shared/infrastructure/mongo/schemas/task.schema";
import {
  TaskStatusModel,
  TaskStatusDocument,
} from "src/shared/infrastructure/mongo/schemas/task-status.schema";
import { TaskStoreValueObject } from "src/tasks/domain/valueObjects/task.store.valueObject";

const DEFAULT_STATUS_NAME = "To Do";

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export class TasksImplementation implements TasksRepository {
  constructor(
    @InjectModel(TaskModel.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(TaskStatusModel.name)
    private readonly taskStatusModel: Model<TaskStatusDocument>
  ) { }

  async store(task: TaskStoreValueObject): Promise<Task> {
    let statusId: Types.ObjectId;

    if (task.getStatusId()) {
      statusId = new Types.ObjectId(task.getStatusId());
    } else {
      const defaultStatus = await this.taskStatusModel.findOne({
        name: DEFAULT_STATUS_NAME,
      });
      if (!defaultStatus) {
        throw new Error(
          `Default task status "${DEFAULT_STATUS_NAME}" not found. Run the task-status seeder.`
        );
      }
      statusId = defaultStatus._id as Types.ObjectId;
    }

    const createdTask = await this.taskModel.create({
      title: task.getTitle(),
      description: task.getDescription() ?? "",
      status: statusId,
      userId: new Types.ObjectId(task.getUserId()),
      dueDate: task.getDueDate(),
      priority: task.getPriority(),
    });

    return new Task({
      id: (createdTask._id as Types.ObjectId).toString(),
      title: createdTask.title,
      description: createdTask.description,
      statusId: createdTask.status.toString(),
      userId: createdTask.userId.toString(),
      dueDate: createdTask.dueDate,
      priority: (createdTask.priority ?? "normal") as "low" | "normal" | "high",
    });
  }

  async findAllByUserId(userId: string): Promise<Task[]> {
    const docs = await this.taskModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate<{ status: TaskStatusModel }>("status")
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const withPriority = docs.map((d) => {
      const priority = (d as { priority?: string }).priority ?? "normal";
      return { doc: d, priorityOrder: PRIORITY_ORDER[priority] ?? 1 };
    });
    withPriority.sort((a, b) => a.priorityOrder - b.priorityOrder);

    return withPriority.map(({ doc: d }) => {
      const status = d.status as unknown as { _id: Types.ObjectId; name: string } | null;
      const priority = (d as { priority?: string }).priority ?? "normal";
      return new Task({
        id: (d._id as Types.ObjectId).toString(),
        title: d.title,
        description: d.description,
        statusId:
          status?._id?.toString() ??
          (typeof d.status === "object" && d.status && "_id" in d.status
            ? String((d.status as { _id: unknown })._id)
            : String(d.status)),
        statusName: status?.name,
        userId: (d.userId as Types.ObjectId).toString(),
        dueDate: d.dueDate,
        priority: priority as "low" | "normal" | "high",
      });
    });
  }

  async updateStatus(
    taskId: string,
    userId: string,
    statusId: string
  ): Promise<Task | null> {
    const updated = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          userId: new Types.ObjectId(userId),
        },
        { status: new Types.ObjectId(statusId) },
        { new: true }
      )
      .populate<{ status: TaskStatusModel }>("status")
      .lean()
      .exec();

    if (!updated) return null;

    const status = updated.status as unknown as {
      _id: Types.ObjectId;
      name: string;
    } | null;
    const priority = (updated as { priority?: string }).priority ?? "normal";

    return new Task({
      id: (updated._id as Types.ObjectId).toString(),
      title: updated.title,
      description: updated.description,
      statusId: status?._id?.toString() ?? String(updated.status),
      statusName: status?.name,
      userId: (updated.userId as Types.ObjectId).toString(),
      dueDate: updated.dueDate,
      priority: priority as "low" | "normal" | "high",
    });
  }
}
