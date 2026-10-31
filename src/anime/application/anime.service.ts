import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  AnimeEntryDocument,
  AnimeEntryModel,
  AnimeWatchStatus,
} from "src/shared/infrastructure/mongo/schemas/anime-entry.schema";
import { AnilistClient, AnilistMedia } from "./anilist.client";
import { AnimeAddDto } from "../infrastructure/dtos/anime-add.dto";
import { AnimeUpdateDto } from "../infrastructure/dtos/anime-update.dto";

export type AnimeEntryDto = {
  id: string;
  anilistId: number;
  title: string;
  titleEnglish: string;
  titleNative: string;
  coverImage: string;
  bannerImage: string;
  genres: string[];
  format: string;
  episodes: number | null;
  anilistScore: number | null;
  season: string;
  seasonYear: number | null;
  anilistStatus: string;
  description: string;
  studios: string[];
  siteUrl: string;
  watchStatus: AnimeWatchStatus;
  score: number | null;
  watchedEpisodes: number;
  favorite: boolean;
  notes: string;
  updatedAt: string;
};

@Injectable()
export class AnimeService {
  constructor(
    @InjectModel(AnimeEntryModel.name)
    private readonly entries: Model<AnimeEntryDocument>,
    private readonly anilist: AnilistClient
  ) {}

  async search(q: string, page = 1, genre?: string) {
    const res = await this.anilist.search({ search: q, page, genre });
    return {
      page: res.page,
      hasNextPage: res.hasNextPage,
      items: res.items.map((m) => ({
        anilistId: m.id,
        title: m.title.romaji || m.title.english || m.title.native || "Sin título",
        titleEnglish: m.title.english ?? "",
        coverImage:
          m.coverImage.large || m.coverImage.extraLarge || m.coverImage.medium || "",
        genres: m.genres ?? [],
        format: m.format ?? "",
        episodes: m.episodes,
        anilistScore: m.averageScore,
        seasonYear: m.seasonYear,
        description: stripHtml(m.description ?? "").slice(0, 400),
      })),
    };
  }

  genres() {
    return this.anilist.genres();
  }

  async list(
    userId: string,
    opts: {
      watchStatus?: AnimeWatchStatus;
      genre?: string;
      favorite?: boolean;
      q?: string;
    } = {}
  ): Promise<AnimeEntryDto[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (opts.watchStatus) filter.watchStatus = opts.watchStatus;
    if (opts.favorite) filter.favorite = true;
    if (opts.genre) filter.genres = opts.genre;
    if (opts.q?.trim()) {
      const rx = new RegExp(escapeRegex(opts.q.trim()), "i");
      filter.$or = [{ title: rx }, { titleEnglish: rx }, { titleNative: rx }];
    }
    const docs = await this.entries
      .find(filter)
      .sort({ favorite: -1, score: -1, updatedAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDto(d));
  }

  async stats(userId: string) {
    const uid = new Types.ObjectId(userId);
    const rows = await this.entries
      .aggregate<{
        _id: AnimeWatchStatus;
        count: number;
        avgScore: number | null;
      }>([
        { $match: { userId: uid } },
        {
          $group: {
            _id: "$watchStatus",
            count: { $sum: 1 },
            avgScore: { $avg: "$score" },
          },
        },
      ])
      .exec();
    const byStatus = Object.fromEntries(
      rows.map((r) => [r._id, { count: r.count, avgScore: r.avgScore }])
    );
    const total = rows.reduce((n, r) => n + r.count, 0);
    const scored = await this.entries
      .aggregate<{ avg: number | null; count: number }>([
        { $match: { userId: uid, score: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
      ])
      .exec();
    return {
      total,
      byStatus,
      avgScore: scored[0]?.avg ?? null,
      scoredCount: scored[0]?.count ?? 0,
    };
  }

  async add(userId: string, body: AnimeAddDto): Promise<AnimeEntryDto> {
    const uid = new Types.ObjectId(userId);
    const existing = await this.entries
      .findOne({ userId: uid, anilistId: body.anilistId })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException("Ese anime ya está en tu biblioteca");
    }
    const media = await this.anilist.getById(body.anilistId);
    if (!media) throw new NotFoundException("No se encontró el anime en AniList");
    const snap = snapshot(media);
    const created = await this.entries.create({
      userId: uid,
      ...snap,
      watchStatus: body.watchStatus ?? "planned",
      score: body.score ?? null,
      watchedEpisodes: body.watchStatus === "completed" ? snap.episodes ?? 0 : 0,
      favorite: false,
      notes: "",
    });
    return this.toDto(created);
  }

  async update(
    userId: string,
    id: string,
    body: AnimeUpdateDto
  ): Promise<AnimeEntryDto> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const $set: Record<string, unknown> = {};
    if (body.watchStatus !== undefined) $set.watchStatus = body.watchStatus;
    if (body.score !== undefined) $set.score = body.score;
    if (body.watchedEpisodes !== undefined)
      $set.watchedEpisodes = body.watchedEpisodes;
    if (body.favorite !== undefined) $set.favorite = body.favorite;
    if (body.notes !== undefined) $set.notes = body.notes;
    const doc = await this.entries
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException();
    return this.toDto(doc);
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const res = await this.entries
      .deleteOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!res.deletedCount) throw new NotFoundException();
    return { deleted: true };
  }

  private toDto(d: AnimeEntryDocument | Record<string, unknown>): AnimeEntryDto {
    const row = d as AnimeEntryDocument;
    return {
      id: String(row._id),
      anilistId: row.anilistId,
      title: row.title,
      titleEnglish: row.titleEnglish ?? "",
      titleNative: row.titleNative ?? "",
      coverImage: row.coverImage ?? "",
      bannerImage: row.bannerImage ?? "",
      genres: row.genres ?? [],
      format: row.format ?? "",
      episodes: row.episodes ?? null,
      anilistScore: row.anilistScore ?? null,
      season: row.season ?? "",
      seasonYear: row.seasonYear ?? null,
      anilistStatus: row.anilistStatus ?? "",
      description: row.description ?? "",
      studios: row.studios ?? [],
      siteUrl: row.siteUrl ?? "",
      watchStatus: row.watchStatus,
      score: row.score ?? null,
      watchedEpisodes: row.watchedEpisodes ?? 0,
      favorite: !!row.favorite,
      notes: row.notes ?? "",
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}

function snapshot(media: AnilistMedia) {
  return {
    anilistId: media.id,
    title: media.title.romaji || media.title.english || media.title.native || "Sin título",
    titleEnglish: media.title.english ?? "",
    titleNative: media.title.native ?? "",
    coverImage:
      media.coverImage.extraLarge ||
      media.coverImage.large ||
      media.coverImage.medium ||
      "",
    bannerImage: media.bannerImage ?? "",
    genres: media.genres ?? [],
    format: media.format ?? "",
    episodes: media.episodes ?? null,
    anilistScore: media.averageScore ?? null,
    season: media.season ?? "",
    seasonYear: media.seasonYear ?? null,
    anilistStatus: media.status ?? "",
    description: stripHtml(media.description ?? "").slice(0, 2000),
    studios: (media.studios?.nodes ?? []).map((n) => n.name),
    siteUrl: media.siteUrl ?? "",
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
