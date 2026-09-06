import { Injectable, Inject, Logger } from "@nestjs/common";
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
import { CronConfigPutDto } from "../infrastructure/dtos/cron-config-put.dto";
import { UsersLoginRepository } from "src/users/domain/repositories/users-login.repository";
import { assertCronExpression, cronSlotIfDue } from "./cron-expression";
import { formatDemoCheckInLog, runDemoCheckIn } from "./demo-checkin";

const MAX_LOGS_PER_USER = 200;
const DEFAULT_CRON = "40 3 * * 1-5";
const DEFAULT_TZ = "America/Bogota";

export type CronConfigDto = {
  enabled: boolean;
  scheduleType: "interval" | "cron";
  everyMinutes: number;
  cronExpression: string;
  timezone: string;
  randomDelayMaxSeconds: number;
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
    private readonly logModel: Model<CronLogDocument>,
    @Inject("UsersLoginRepository")
    private readonly users: UsersLoginRepository
  ) {}

  async getConfig(userId: string): Promise<CronConfigDto> {
    const doc = await this.ensureConfig(userId);
    return this.toConfigDto(doc);
  }

  async putConfig(
    userId: string,
    body: CronConfigPutDto
  ): Promise<CronConfigDto> {
    const uid = new Types.ObjectId(userId);
    const current = await this.ensureConfig(userId);
    const scheduleType = body.scheduleType ?? current.scheduleType ?? "interval";
    const cronExpression =
      scheduleType === "cron"
        ? assertCronExpression(body.cronExpression ?? current.cronExpression ?? DEFAULT_CRON)
        : (current.cronExpression || DEFAULT_CRON);
    const $set: Record<string, unknown> = {
      enabled: body.enabled,
      scheduleType,
      cronExpression,
      timezone: DEFAULT_TZ,
    };
    if (body.everyMinutes !== undefined) $set.everyMinutes = body.everyMinutes;
    if (body.randomDelayMaxSeconds !== undefined)
      $set.randomDelayMaxSeconds = body.randomDelayMaxSeconds;
    const doc = await this.configModel
      .findOneAndUpdate({ userId: uid }, { $set }, { new: true, upsert: true })
      .exec();
    return this.toConfigDto(doc ?? current);
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
    return this.executeDemo(userId, "manual", 0);
  }

  @Cron("* * * * *")
  async tick(): Promise<void> {
    const now = new Date();
    const configs = await this.configModel.find({ enabled: true }).lean().exec();
    for (const cfg of configs) {
      const userId = String(cfg.userId);
      try {
        const account = await this.users.findById(userId);
        if (!account || account.getRole() !== "admin") continue;

        if ((cfg.scheduleType || "interval") === "cron") {
          const slot = cronSlotIfDue(
            cfg.cronExpression || DEFAULT_CRON,
            cfg.timezone || DEFAULT_TZ,
            now
          );
          if (!slot) continue;
          const slotKey = slot.toISOString();
          if (cfg.lastRunSlot === slotKey) continue;
          await this.configModel.updateOne(
            { userId: cfg.userId },
            { $set: { lastRunSlot: slotKey, lastRunAt: now } }
          );
          const delay = this.pickDelay(cfg.randomDelayMaxSeconds);
          void this.executeDemo(userId, "scheduled", delay).catch((e) => {
            this.logger.warn(
              `Cron demo falló para ${userId}: ${e instanceof Error ? e.message : e}`
            );
          });
          continue;
        }
        const everyMs = Math.max(1, cfg.everyMinutes || 5) * 60_000;
        const last = cfg.lastRunAt ? new Date(cfg.lastRunAt).getTime() : 0;
        if (last && now.getTime() - last < everyMs) continue;
        await this.executeDemo(userId, "scheduled", 0);
      } catch (e) {
        this.logger.warn(
          `No se pudo correr el cron para ${userId}: ${
            e instanceof Error ? e.message : e
          }`
        );
      }
    }
  }

  private pickDelay(maxSeconds?: number): number {
    const max = Math.min(600, Math.max(0, maxSeconds ?? 0));
    if (max <= 0) return 0;
    return Math.floor(Math.random() * (max + 1));
  }

  private async executeDemo(
    userId: string,
    source: "scheduled" | "manual",
    delaySeconds: number
  ): Promise<CronLogDto> {
    if (delaySeconds > 0) {
      await new Promise((r) => setTimeout(r, delaySeconds * 1000));
    }
    let message: string;
    try {
      const result = await runDemoCheckIn();
      message = formatDemoCheckInLog(result, {
        delaySeconds: delaySeconds || undefined,
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      message = [
        "RESULTADO: error de red",
        `Error: ${err}`,
        delaySeconds > 0 ? `(delay ${delaySeconds}s)` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    return this.appendLog(userId, source, message);
  }

  private async appendLog(
    userId: string,
    source: "scheduled" | "manual",
    message: string
  ): Promise<CronLogDto> {
    const uid = new Types.ObjectId(userId);
    const created = await this.logModel.create({
      userId: uid,
      message,
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
      scheduleType: "interval",
      cronExpression: DEFAULT_CRON,
      timezone: DEFAULT_TZ,
      randomDelayMaxSeconds: 0,
      lastRunAt: null,
      lastRunSlot: null,
    });
  }

  private toConfigDto(doc: CronConfigDocument): CronConfigDto {
    return {
      enabled: !!doc.enabled,
      scheduleType: doc.scheduleType === "cron" ? "cron" : "interval",
      everyMinutes: doc.everyMinutes || 5,
      cronExpression: doc.cronExpression || DEFAULT_CRON,
      timezone: doc.timezone || DEFAULT_TZ,
      randomDelayMaxSeconds: doc.randomDelayMaxSeconds ?? 0,
      lastRunAt: doc.lastRunAt ? new Date(doc.lastRunAt).toISOString() : null,
    };
  }
}
