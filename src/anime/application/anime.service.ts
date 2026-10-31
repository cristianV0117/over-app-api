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

export type AnimeCatalogItemDto = {
  anilistId: number;
  title: string;
  titleEnglish: string;
  coverImage: string;
  bannerImage: string;
  genres: string[];
  format: string;
  episodes: number | null;
  anilistScore: number | null;
  seasonYear: number | null;
  anilistStatus: string;
  description: string;
  nextEpisode: { episode: number; airingAt: number } | null;
};

export type AnimeRecommendationDto = AnimeCatalogItemDto & {
  score: number;
  because: string[];
};

export type AnimeDetailDto = AnimeCatalogItemDto & {
  titleNative: string;
  season: string;
  studios: string[];
  siteUrl: string;
  relations: {
    seasons: AnimeCatalogItemDto[];
    movies: AnimeCatalogItemDto[];
    ovas: AnimeCatalogItemDto[];
    others: AnimeCatalogItemDto[];
  };
};

@Injectable()
export class AnimeService {
  private readonly recCache = new Map<
    string,
    { at: number; data: AnimeRecommendationDto[] }
  >();

  constructor(
    @InjectModel(AnimeEntryModel.name)
    private readonly entries: Model<AnimeEntryDocument>,
    private readonly anilist: AnilistClient
  ) {}

  async search(
    q: string,
    page = 1,
    opts: { genre?: string; format?: string; sort?: string; mainOnly?: boolean } = {}
  ) {
    const res = await this.anilist.search({
      search: q,
      page,
      genre: opts.genre,
      format: opts.format,
      sort: opts.sort,
      mainOnly: opts.mainOnly,
    });
    return {
      page: res.page,
      hasNextPage: res.hasNextPage,
      lastPage: res.lastPage,
      items: res.items.map(toCatalogItem),
    };
  }

  genres() {
    return this.anilist.genres();
  }

  async detail(anilistId: number): Promise<AnimeDetailDto> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) {
      throw new NotFoundException("No se encontró el anime en AniList");
    }
    const media = await this.anilist.getById(anilistId);
    if (!media) throw new NotFoundException("No se encontró el anime en AniList");
    const snap = snapshot(media);
    return {
      ...toCatalogItem(media),
      titleNative: snap.titleNative,
      season: snap.season,
      studios: snap.studios,
      siteUrl: snap.siteUrl,
      description: snap.description,
      relations: groupRelations(media),
    };
  }

  async recommend(userId: string): Promise<AnimeRecommendationDto[]> {
    const docs = await this.entries
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!docs.length) return [];

    const cacheKey = docs
      .map((d) => `${d.anilistId}:${d.watchStatus}:${d.score ?? ""}:${d.favorite ? 1 : 0}`)
      .sort()
      .join("|");
    const cached = this.recCache.get(`${userId}:${cacheKey}`);
    if (cached && Date.now() - cached.at < 10 * 60_000) return cached.data;

    const owned = new Set(docs.map((d) => d.anilistId));
    const seeds = docs
      .map((d) => ({ doc: d, weight: seedWeight(d) }))
      .filter((s) => s.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12);

    const genreWeight = new Map<string, number>();
    const formatWeight = new Map<string, number>();
    for (const { doc, weight } of seeds) {
      for (const g of doc.genres ?? []) {
        genreWeight.set(g, (genreWeight.get(g) ?? 0) + weight);
      }
      if (doc.format) {
        formatWeight.set(doc.format, (formatWeight.get(doc.format) ?? 0) + weight);
      }
    }
    const topGenres = [...genreWeight.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    let recs: Awaited<ReturnType<AnilistClient["recommendationsFor"]>> = [];
    try {
      recs = await this.anilist.recommendationsFor(
        seeds.map((s) => s.doc.anilistId)
      );
    } catch {
      recs = [];
    }
    let extras: AnilistMedia[] = [];
    if (topGenres.length) {
      try {
        extras = await this.anilist.browseByGenres(topGenres, 20);
      } catch {
        extras = [];
      }
    }

    type Acc = {
      media: AnilistMedia;
      score: number;
      sources: Set<string>;
      genresHit: Set<string>;
    };
    const acc = new Map<number, Acc>();

    const bump = (
      media: AnilistMedia,
      add: number,
      source?: string,
      genresHit?: string[]
    ) => {
      if (!media?.id || owned.has(media.id)) return;
      if (media.type && media.type !== "ANIME") return;
      const cur = acc.get(media.id) ?? {
        media,
        score: 0,
        sources: new Set<string>(),
        genresHit: new Set<string>(),
      };
      cur.score += add;
      if (source) cur.sources.add(source);
      for (const g of genresHit ?? []) cur.genresHit.add(g);
      acc.set(media.id, cur);
    };

    for (const rec of recs) {
      const overlap = (rec.media.genres ?? []).filter((g) => genreWeight.has(g));
      const gScore = overlap.reduce((n, g) => n + (genreWeight.get(g) ?? 0), 0);
      const fmt =
        rec.media.format && formatWeight.has(rec.media.format) ? 4 : 0;
      bump(
        rec.media,
        Math.max(0, rec.rating) / 8 + gScore * 1.2 + fmt,
        rec.sourceTitle,
        overlap
      );
    }

    for (const media of extras) {
      const overlap = (media.genres ?? []).filter((g) => genreWeight.has(g));
      const gScore = overlap.reduce((n, g) => n + (genreWeight.get(g) ?? 0), 0);
      bump(media, 4 + gScore, undefined, overlap);
    }

    const ranked = [...acc.values()]
      .map((row) => {
        const multi = row.sources.size > 1 ? row.sources.size * 6 : 0;
        return {
          ...toCatalogItem(row.media),
          score: Math.round((row.score + multi) * 10) / 10,
          because: buildBecause(row.sources, row.genresHit),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 18);

    this.recCache.set(`${userId}:${cacheKey}`, { at: Date.now(), data: ranked });
    return ranked;
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
    this.bustRecCache(userId);
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
    this.bustRecCache(userId);
    return this.toDto(doc);
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const res = await this.entries
      .deleteOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!res.deletedCount) throw new NotFoundException();
    this.bustRecCache(userId);
    return { deleted: true };
  }

  async clear(userId: string): Promise<{ deleted: number }> {
    const res = await this.entries
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
    this.bustRecCache(userId);
    return { deleted: res.deletedCount ?? 0 };
  }

  private bustRecCache(userId: string) {
    const prefix = `${userId}:`;
    for (const key of this.recCache.keys()) {
      if (key.startsWith(prefix)) this.recCache.delete(key);
    }
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

function seedWeight(d: {
  watchStatus: AnimeWatchStatus;
  favorite?: boolean;
  score?: number | null;
}): number {
  if (d.watchStatus === "dropped") return 0;
  let w = 1;
  if (d.favorite) w += 3;
  if (d.watchStatus === "completed") w += 2;
  else if (d.watchStatus === "watching") w += 1.5;
  else if (d.watchStatus === "paused") w += 0.8;
  else if (d.watchStatus === "planned") w += 0.3;
  if (d.score != null) w += d.score / 5;
  return w;
}

function toCatalogItem(m: AnilistMedia): AnimeCatalogItemDto {
  return {
    anilistId: m.id,
    title: m.title.romaji || m.title.english || m.title.native || "Sin título",
    titleEnglish: m.title.english ?? "",
    coverImage:
      m.coverImage.large || m.coverImage.extraLarge || m.coverImage.medium || "",
    bannerImage: m.bannerImage ?? "",
    genres: m.genres ?? [],
    format: m.format ?? "",
    episodes: m.episodes,
    anilistScore: m.averageScore,
    seasonYear: m.seasonYear,
    anilistStatus: m.status ?? "",
    description: stripHtml(m.description ?? "").slice(0, 400),
    nextEpisode: m.nextAiringEpisode
      ? {
          episode: m.nextAiringEpisode.episode,
          airingAt: m.nextAiringEpisode.airingAt,
        }
      : null,
  };
}

function groupRelations(root: AnilistMedia): AnimeDetailDto["relations"] {
  const byId = new Map<number, AnilistMedia>();
  const visit = (media: AnilistMedia | null | undefined, depth: number) => {
    if (!media) return;
    for (const edge of media.relations?.edges ?? []) {
      const node = edge.node;
      if (!node?.id || node.id === root.id || node.type !== "ANIME") continue;
      if (!byId.has(node.id)) byId.set(node.id, node);
      if (
        depth < 1 &&
        (edge.relationType === "PREQUEL" || edge.relationType === "SEQUEL")
      ) {
        visit(node, depth + 1);
      }
    }
  };
  visit(root, 0);

  const seasons: AnimeCatalogItemDto[] = [];
  const movies: AnimeCatalogItemDto[] = [];
  const ovas: AnimeCatalogItemDto[] = [];
  const others: AnimeCatalogItemDto[] = [];
  const relationOf = (id: number) => {
    const hop1 = root.relations?.edges ?? [];
    const direct = hop1.find((e) => e.node?.id === id)?.relationType;
    if (direct) return direct;
    for (const e of hop1) {
      const nested = e.node?.relations?.edges ?? [];
      const found = nested.find((n) => n.node?.id === id)?.relationType;
      if (found) return found;
    }
    return "";
  };

  for (const node of byId.values()) {
    const item = toCatalogItem(node);
    const fmt = node.format ?? "";
    const rel = relationOf(node.id);
    if (rel === "PREQUEL" || rel === "SEQUEL") {
      seasons.push(item);
    } else if (fmt === "MOVIE") {
      movies.push(item);
    } else if (fmt === "OVA" || fmt === "SPECIAL") {
      ovas.push(item);
    } else {
      others.push(item);
    }
  }

  const byYear = (a: AnimeCatalogItemDto, b: AnimeCatalogItemDto) =>
    (a.seasonYear ?? 9999) - (b.seasonYear ?? 9999);
  seasons.sort(byYear);
  movies.sort(byYear);
  ovas.sort(byYear);
  others.sort(byYear);
  return { seasons, movies, ovas, others };
}

function buildBecause(sources: Set<string>, genresHit: Set<string>): string[] {
  const out = [...sources].slice(0, 3);
  for (const g of genresHit) {
    if (out.length >= 4) break;
    if (!out.includes(g)) out.push(g);
  }
  return out;
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
