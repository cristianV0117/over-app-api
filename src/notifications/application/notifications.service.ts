import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  NotificationDocument,
  NotificationModel,
  NotificationSeverity,
  NotificationType,
} from "src/shared/infrastructure/mongo/schemas/notification.schema";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  body: string;
  href?: string;
  dedupeKey: string;
  meta?: Record<string, unknown>;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationModel.name)
    private readonly model: Model<NotificationDocument>
  ) {}

  async createIfNew(input: CreateNotificationInput): Promise<boolean> {
    try {
      await this.model.create({
        userId: new Types.ObjectId(input.userId),
        type: input.type,
        severity: input.severity ?? "info",
        title: input.title,
        body: input.body,
        href: input.href ?? "",
        dedupeKey: input.dedupeKey,
        readAt: null,
        meta: input.meta ?? {},
      });
      return true;
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code === 11000) return false;
      throw e;
    }
  }

  async list(
    userId: string,
    opts: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<NotificationDto[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (opts.unreadOnly) filter.readAt = null;
    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, opts.limit ?? 80)))
      .lean()
      .exec();
    return docs.map((d) => this.toDto(d));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({
      userId: new Types.ObjectId(userId),
      readAt: null,
    });
  }

  async markRead(userId: string, id: string): Promise<NotificationDto | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: { readAt: new Date() } },
        { new: true }
      )
      .lean()
      .exec();
    return doc ? this.toDto(doc) : null;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.model
      .updateMany(
        { userId: new Types.ObjectId(userId), readAt: null },
        { $set: { readAt: new Date() } }
      )
      .exec();
    return { updated: res.modifiedCount ?? 0 };
  }

  private toDto(d: {
    _id: unknown;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    body: string;
    href?: string;
    readAt?: Date | null;
    createdAt: Date;
    meta?: Record<string, unknown>;
  }): NotificationDto {
    return {
      id: String(d._id),
      type: d.type,
      severity: d.severity,
      title: d.title,
      body: d.body,
      href: d.href ?? "",
      readAt: d.readAt ? new Date(d.readAt).toISOString() : null,
      createdAt: new Date(d.createdAt).toISOString(),
      meta: d.meta ?? {},
    };
  }
}
