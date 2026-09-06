import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import {
  CronConfigDocument,
  CronConfigModel,
} from "src/shared/infrastructure/mongo/schemas/cron-config.schema";
import {
  CronLogDocument,
  CronLogModel,
} from "src/shared/infrastructure/mongo/schemas/cron-log.schema";

const HELLO = "hola mundo";
const MAX_LOGS_PER_USER = 200;

export type CronConfigDto = {
  enabled: boolean;
  everyMinutes: number;
  lastRunAt: string | null;
};

export type CronLogDto = {
  id: string;
  message: string;
  source: "scheduled" | "manual";
  createdAt: string;
};

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    @InjectModel(CronConfigModel.name)
    private readonly configModel: Model<CronConfigDocument>,
    @InjectModel(CronLogModel.name)
    private readonly logModel: Model<CronLogDocument>
  ) {}

  async getConfig(userId: string): Promise<CronConfigDto> {
    const doc = await this.ensureConfig(userId);
    return this.toConfigDto(doc);
  }

  async putConfig(
    userId: string,
    enabled: boolean,
    everyMinutes: number
  ): Promise<CronConfigDto> {
    const uid = new Types.ObjectId(userId);
    const doc = await this.configModel
      .findOneAndUpdate(
        { userId: uid },
        { $set: { enabled, everyMinutes } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .exec();
    return this.toConfigDto(doc);
  }

  async listLogs(userId: string, limit = 80): Promise<CronLogDto[]> {
    const docs = await this.logModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean()
      .exec();
    return docs.map((d) => ({
      id: String(d._id),
      message: d.message,
      source: d.source,
      createdAt: new Date(d.createdAt).toISOString(),
    }));
  }

  async runNow(userId: string): Promise<CronLogDto> {
    return this.appendLog(userId, "manual");
  }

  @Cron("* * * * *")
  async tick(): Promise<void> {
    const now = Date.now();
    const configs = await this.configModel.find({ enabled: true }).lean().exec();
    for (const cfg of configs) {
      const everyMs = Math.max(1, cfg.everyMinutes) * 60_000;
      const last = cfg.lastRunAt ? new Date(cfg.lastRunAt).getTime() : 0;
      if (last && now - last < everyMs) continue;
      try {
        await this.appendLog(String(cfg.userId), "scheduled");
      } catch (e) {
        this.logger.warn(
          `No se pudo escribir el log del cron para ${String(cfg.userId)}: ${
            e instanceof Error ? e.message : e
          }`
        );
      }
    }
  }

  private async appendLog(
    userId: string,
    source: "scheduled" | "manual"
  ): Promise<CronLogDto> {
    const uid = new Types.ObjectId(userId);
    const created = await this.logModel.create({
      userId: uid,
      message: HELLO,
      source,
    });
    await this.configModel.updateOne(
      { userId: uid },
      { $set: { lastRunAt: new Date() } },
      { upsert: true }
    );
    const extra = await this.logModel
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .skip(MAX_LOGS_PER_USER)
      .select("_id")
      .lean()
      .exec();
    if (extra.length) {
      await this.logModel.deleteMany({
        _id: { $in: extra.map((x) => x._id) },
      });
    }
    return {
      id: created.id,
      message: created.message,
      source: created.source,
      createdAt: created.createdAt.toISOString(),
    };
  }

  private async ensureConfig(userId: string): Promise<CronConfigDocument> {
    const uid = new Types.ObjectId(userId);
    const existing = await this.configModel.findOne({ userId: uid }).exec();
    if (existing) return existing;
    return this.configModel.create({
      userId: uid,
      enabled: false,
      everyMinutes: 5,
      lastRunAt: null,
    });
  }

  private toConfigDto(doc: CronConfigDocument): CronConfigDto {
    return {
      enabled: !!doc.enabled,
      everyMinutes: doc.everyMinutes || 5,
      lastRunAt: doc.lastRunAt ? new Date(doc.lastRunAt).toISOString() : null,
    };
  }
}
