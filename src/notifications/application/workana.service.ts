import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { Model } from "mongoose";
import {
  UserDocument,
  UserModel,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import {
  WorkanaJobDocument,
  WorkanaJobModel,
} from "src/shared/infrastructure/mongo/schemas/workana-job.schema";
import { NotificationsService } from "./notifications.service";
import { scoreWorkanaJob } from "./workana-score";
import { bogotaYmd } from "./bogota-date";

const WORKANA_ORIGIN = "https://www.workana.com";
const MAX_STORED = 250;
const PAGES = 2;

type RawSkill = { anchorText?: string };
type RawJob = {
  slug?: string;
  title?: string;
  url?: string;
  authorName?: string;
  description?: string;
  skills?: RawSkill[];
  budget?: string;
  isHourly?: boolean;
  isUrgent?: boolean;
  hasVerifiedPaymentMethod?: boolean;
  totalBids?: string;
  postedDate?: string;
  country?: string;
};

export type WorkanaJobDto = {
  id: string;
  slug: string;
  title: string;
  url: string;
  authorName: string;
  description: string;
  skills: string[];
  budget: string;
  isHourly: boolean;
  isUrgent: boolean;
  hasVerifiedPaymentMethod: boolean;
  totalBids: number | null;
  postedDate: string;
  country: string;
  score: number;
  matchedSkills: string[];
  highlighted: boolean;
  notifiedAt: string | null;
  fetchedAt: string;
};

@Injectable()
export class WorkanaService implements OnModuleInit {
  private readonly logger = new Logger(WorkanaService.name);

  constructor(
    @InjectModel(WorkanaJobModel.name)
    private readonly jobs: Model<WorkanaJobDocument>,
    @InjectModel(UserModel.name)
    private readonly users: Model<UserDocument>,
    private readonly notifications: NotificationsService
  ) {}

  onModuleInit() {
    setTimeout(() => {
      void this.syncAll().catch((e) =>
        this.logger.warn(
          `Workana sync inicial falló: ${e instanceof Error ? e.message : e}`
        )
      );
    }, 12_000);
  }

  @Cron("0 */6 * * *")
  async tick(): Promise<void> {
    try {
      await this.syncAll();
    } catch (e) {
      this.logger.warn(
        `Workana tick falló: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  async list(opts: { highlighted?: boolean; limit?: number } = {}): Promise<{
    jobs: WorkanaJobDto[];
    lastFetchedAt: string | null;
    configured: boolean;
  }> {
    const filter = opts.highlighted ? { highlighted: true } : {};
    const docs = await this.jobs
      .find(filter)
      .sort({ highlighted: -1, score: -1, fetchedAt: -1 })
      .limit(Math.min(100, Math.max(1, opts.limit ?? 40)))
      .lean()
      .exec();
    const latest = await this.jobs
      .findOne()
      .sort({ fetchedAt: -1 })
      .select("fetchedAt")
      .lean()
      .exec();
    return {
      jobs: docs.map((d) => this.toDto(d)),
      lastFetchedAt: latest?.fetchedAt
        ? new Date(latest.fetchedAt).toISOString()
        : null,
      configured: Boolean(this.cookie()),
    };
  }

  async syncAll(): Promise<{ fetched: number; newHighlighted: number }> {
    const cookie = this.cookie();
    if (!cookie) {
      this.logger.warn(
        "WORKANA_COOKIE no está configurada. Saltando sync de Workana."
      );
      return { fetched: 0, newHighlighted: 0 };
    }

    const queries = this.queries();
    const admins = await this.users
      .find({ role: "admin" })
      .select("_id")
      .lean()
      .exec();
    const adminIds = admins.map((u) => String(u._id));

    let fetched = 0;
    let newHighlighted = 0;
    const now = new Date();

    try {
      for (const query of queries) {
        for (let page = 1; page <= PAGES; page++) {
          const raw = await this.fetchPage(query, page, cookie);
          fetched += raw.length;
          for (const job of raw) {
            const created = await this.upsertJob(job, query, now, adminIds);
            if (created) newHighlighted += 1;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Workana sync error: ${msg}`);
      const { iso } = bogotaYmd();
      for (const adminId of adminIds) {
        await this.notifications.createIfNew({
          userId: adminId,
          type: "workana_session",
          severity: "urgent",
          title: "Workana: no se pudo leer proyectos",
          body:
            msg.includes("401") || msg.includes("403")
              ? "La sesión de Workana expiró o Cloudflare bloqueó la petición. Actualiza WORKANA_COOKIE."
              : `Error al consultar Workana: ${msg.slice(0, 240)}`,
          href: "/dashboard/workana",
          dedupeKey: `workana-session:${iso}`,
        });
      }
      throw e;
    }

    await this.pruneOld();
    this.logger.log(
      `Workana sync: ${fetched} jobs, ${newHighlighted} destacados nuevos`
    );
    return { fetched, newHighlighted };
  }

  private cookie(): string {
    return (process.env.WORKANA_COOKIE ?? "").trim();
  }

  private queries(): string[] {
    const raw = process.env.WORKANA_QUERIES ?? "php,nestjs,typescript";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : ["php"];
  }

  private async fetchPage(
    query: string,
    page: number,
    cookie: string
  ): Promise<RawJob[]> {
    const url = `${WORKANA_ORIGIN}/jobs?language=${encodeURIComponent(
      "en,es"
    )}&query=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "es-419,es;q=0.9",
        "x-requested-with": "XMLHttpRequest",
        referer: url,
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        cookie,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      results?: { results?: RawJob[] };
    };
    return json.results?.results ?? [];
  }

  private async upsertJob(
    raw: RawJob,
    query: string,
    now: Date,
    adminIds: string[]
  ): Promise<boolean> {
    const slug = (raw.slug ?? "").trim();
    if (!slug) return false;
    const title = extractTitle(raw.title ?? "");
    const description = stripHtml(raw.description ?? "").slice(0, 1200);
    const skills = (raw.skills ?? [])
      .map((s) => (s.anchorText ?? "").trim())
      .filter(Boolean);
    const ranked = scoreWorkanaJob({
      skills,
      title,
      description,
      budget: raw.budget ?? "",
      isHourly: !!raw.isHourly,
      isUrgent: !!raw.isUrgent,
      hasVerifiedPaymentMethod: !!raw.hasVerifiedPaymentMethod,
      totalBidsRaw: raw.totalBids,
    });

    const existing = await this.jobs.findOne({ slug }).lean().exec();
    await this.jobs.updateOne(
      { slug },
      {
        $set: {
          title,
          url: `${WORKANA_ORIGIN}/job/${slug}`,
          authorName: raw.authorName ?? "",
          description,
          skills,
          budget: raw.budget ?? "",
          isHourly: !!raw.isHourly,
          isUrgent: !!raw.isUrgent,
          hasVerifiedPaymentMethod: !!raw.hasVerifiedPaymentMethod,
          totalBids: ranked.bids,
          postedDate: raw.postedDate ?? "",
          country: extractCountry(raw.country ?? ""),
          query,
          score: ranked.score,
          matchedSkills: ranked.matchedSkills,
          highlighted: ranked.highlighted,
          fetchedAt: now,
        },
        $setOnInsert: { slug, notifiedAt: null },
      },
      { upsert: true }
    );

    const alreadyNotified = Boolean(existing?.notifiedAt);
    if (!ranked.highlighted || alreadyNotified) return false;

    const skillLabel = ranked.matchedSkills.slice(0, 4).join(", ");
    for (const adminId of adminIds) {
      await this.notifications.createIfNew({
        userId: adminId,
        type: "workana",
        severity: ranked.score >= 10 ? "urgent" : "info",
        title: title.slice(0, 140),
        body: [
          raw.budget || "Presupuesto no indicado",
          skillLabel ? `Stack: ${skillLabel}` : null,
          raw.postedDate,
          ranked.bids != null ? `${ranked.bids} propuestas` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/dashboard/workana",
        dedupeKey: `workana:${slug}`,
        meta: { slug, score: ranked.score, url: `${WORKANA_ORIGIN}/job/${slug}` },
      });
    }
    await this.jobs.updateOne({ slug }, { $set: { notifiedAt: now } });
    return true;
  }

  private async pruneOld(): Promise<void> {
    const extra = await this.jobs
      .find()
      .sort({ fetchedAt: -1 })
      .skip(MAX_STORED)
      .select("_id")
      .lean()
      .exec();
    if (extra.length) {
      await this.jobs.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
    }
  }

  private toDto(d: WorkanaJobDocument | Record<string, unknown>): WorkanaJobDto {
    const row = d as WorkanaJobDocument;
    return {
      id: String(row._id),
      slug: row.slug,
      title: row.title,
      url: row.url,
      authorName: row.authorName,
      description: row.description,
      skills: row.skills ?? [],
      budget: row.budget,
      isHourly: row.isHourly,
      isUrgent: row.isUrgent,
      hasVerifiedPaymentMethod: row.hasVerifiedPaymentMethod,
      totalBids: row.totalBids ?? null,
      postedDate: row.postedDate,
      country: row.country,
      score: row.score,
      matchedSkills: row.matchedSkills ?? [],
      highlighted: row.highlighted,
      notifiedAt: row.notifiedAt
        ? new Date(row.notifiedAt).toISOString()
        : null,
      fetchedAt: new Date(row.fetchedAt).toISOString(),
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/title="([^"]+)"/);
  if (m?.[1]) return decodeEntities(m[1]);
  return stripHtml(html);
}

function extractCountry(html: string): string {
  const m = html.match(/title="([^"]+)"/);
  if (m?.[1]) return decodeEntities(m[1]);
  return stripHtml(html);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
