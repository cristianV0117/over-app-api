import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  GameEntryDocument,
  GameEntryModel,
  GamePlayStatus,
} from "src/shared/infrastructure/mongo/schemas/game-entry.schema";
import { RawgClient, RawgGame } from "./rawg.client";
import { GameAddDto } from "../infrastructure/dtos/game-add.dto";
import { GameUpdateDto } from "../infrastructure/dtos/game-update.dto";

export type GameCatalogItemDto = {
  rawgId: number;
  title: string;
  coverImage: string;
  bannerImage: string;
  genres: string[];
  platforms: string[];
  rawgScore: number | null;
  metacritic: number | null;
  released: string;
  rawgStatus: string;
  description: string;
  playtime: number | null;
};

export type GameRecommendationDto = GameCatalogItemDto & {
  score: number;
  because: string[];
};

export type GameDetailDto = GameCatalogItemDto & {
  developers: string[];
  siteUrl: string;
  relations: {
    series: GameCatalogItemDto[];
    extras: GameCatalogItemDto[];
  };
};

export type GameEntryDto = GameCatalogItemDto & {
  id: string;
  developers: string[];
  siteUrl: string;
  playStatus: GamePlayStatus;
  score: number | null;
  hoursPlayed: number;
  favorite: boolean;
  notes: string;
  updatedAt: string;
};

@Injectable()
export class GameService {
  private readonly recCache = new Map<
    string,
    { at: number; data: GameRecommendationDto[] }
  >();

  constructor(
    @InjectModel(GameEntryModel.name)
    private readonly entries: Model<GameEntryDocument>,
    private readonly rawg: RawgClient
  ) {}

  async search(
    q: string,
    page = 1,
    opts: { genre?: string; platform?: string; sort?: string; mainOnly?: boolean } = {}
  ) {
    const res = await this.rawg.search({
      search: q,
      page,
      genre: opts.genre,
      platform: opts.platform,
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
    return this.rawg.genres();
  }

  async detail(rawgId: number): Promise<GameDetailDto> {
    if (!Number.isFinite(rawgId) || rawgId <= 0) {
      throw new NotFoundException("No se encontró el juego en RAWG");
    }
    const game = await this.rawg.getById(rawgId);
    if (!game) throw new NotFoundException("No se encontró el juego en RAWG");
    const snap = snapshot(game);
    let series: RawgGame[] = [];
    let extras: RawgGame[] = [];
    try {
      [series, extras] = await Promise.all([
        this.rawg.series(rawgId),
        this.rawg.additions(rawgId),
      ]);
    } catch {
      series = [];
      extras = [];
    }
    return {
      ...toCatalogItem(game),
      developers: snap.developers,
      siteUrl: snap.siteUrl,
      description: snap.description,
      relations: {
        series: series.filter((g) => g.id !== rawgId).map(toCatalogItem),
        extras: extras.filter((g) => g.id !== rawgId).map(toCatalogItem),
      },
    };
  }

  async recommend(userId: string): Promise<GameRecommendationDto[]> {
    const docs = await this.entries
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!docs.length) return [];

    const cacheKey = docs
      .map((d) => `${d.rawgId}:${d.playStatus}:${d.score ?? ""}:${d.favorite ? 1 : 0}`)
      .sort()
      .join("|");
    const cached = this.recCache.get(`${userId}:${cacheKey}`);
    if (cached && Date.now() - cached.at < 10 * 60_000) return cached.data;

    const owned = new Set(docs.map((d) => d.rawgId));
    const seeds = docs
      .map((d) => ({ doc: d, weight: seedWeight(d) }))
      .filter((s) => s.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);

    const genreWeight = new Map<string, number>();
    for (const { doc, weight } of seeds) {
      for (const g of doc.genres ?? []) {
        genreWeight.set(g, (genreWeight.get(g) ?? 0) + weight);
      }
    }
    const topGenres = [...genreWeight.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([g]) => slugify(g));

    const acc = new Map<
      number,
      { game: RawgGame; score: number; sources: Set<string>; genresHit: Set<string> }
    >();
    const bump = (game: RawgGame, add: number, source?: string, genresHit?: string[]) => {
      if (!game?.id || owned.has(game.id)) return;
      const cur = acc.get(game.id) ?? {
        game,
        score: 0,
        sources: new Set<string>(),
        genresHit: new Set<string>(),
      };
      cur.score += add;
      if (source) cur.sources.add(source);
      for (const g of genresHit ?? []) cur.genresHit.add(g);
      acc.set(game.id, cur);
    };

    for (const { doc } of seeds.slice(0, 6)) {
      try {
        const sug = await this.rawg.suggested(doc.rawgId, 10);
        for (const game of sug) {
          const overlap = (game.genres ?? [])
            .map((g) => g.name)
            .filter((g) => genreWeight.has(g));
          bump(game, 8, doc.title, overlap);
        }
      } catch {
        /* skip seed */
      }
    }
    if (topGenres.length) {
      try {
        const extras = await this.rawg.browseByGenres(topGenres, 20);
        for (const game of extras) {
          const overlap = (game.genres ?? [])
            .map((g) => g.name)
            .filter((g) => genreWeight.has(g));
          bump(game, 4, undefined, overlap);
        }
      } catch {
        /* ignore */
      }
    }

    const ranked = [...acc.values()]
      .map((row) => {
        const multi = row.sources.size > 1 ? row.sources.size * 6 : 0;
        return {
          ...toCatalogItem(row.game),
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
      playStatus?: GamePlayStatus;
      genre?: string;
      favorite?: boolean;
      q?: string;
    } = {}
  ): Promise<GameEntryDto[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (opts.playStatus) filter.playStatus = opts.playStatus;
    if (opts.favorite) filter.favorite = true;
    if (opts.genre) filter.genres = opts.genre;
    if (opts.q?.trim()) {
      const rx = new RegExp(escapeRegex(opts.q.trim()), "i");
      filter.title = rx;
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
      .aggregate<{ _id: GamePlayStatus; count: number; avgScore: number | null }>([
        { $match: { userId: uid } },
        {
          $group: {
            _id: "$playStatus",
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

  async add(userId: string, body: GameAddDto): Promise<GameEntryDto> {
    const uid = new Types.ObjectId(userId);
    const existing = await this.entries
      .findOne({ userId: uid, rawgId: body.rawgId })
      .lean()
      .exec();
    if (existing) throw new ConflictException("Ese juego ya está en tu biblioteca");
    const game = await this.rawg.getById(body.rawgId);
    if (!game) throw new NotFoundException("No se encontró el juego en RAWG");
    const snap = snapshot(game);
    const created = await this.entries.create({
      userId: uid,
      ...snap,
      playStatus: body.playStatus ?? "planned",
      score: body.score ?? null,
      hoursPlayed: 0,
      favorite: false,
      notes: "",
    });
    this.bustRecCache(userId);
    return this.toDto(created);
  }

  async update(userId: string, id: string, body: GameUpdateDto): Promise<GameEntryDto> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const $set: Record<string, unknown> = {};
    if (body.playStatus !== undefined) $set.playStatus = body.playStatus;
    if (body.score !== undefined) $set.score = body.score;
    if (body.hoursPlayed !== undefined) $set.hoursPlayed = body.hoursPlayed;
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

  private toDto(d: GameEntryDocument | Record<string, unknown>): GameEntryDto {
    const row = d as GameEntryDocument;
    return {
      id: String(row._id),
      rawgId: row.rawgId,
      title: row.title,
      coverImage: row.coverImage ?? "",
      bannerImage: row.bannerImage ?? "",
      genres: row.genres ?? [],
      platforms: row.platforms ?? [],
      rawgScore: row.rawgScore ?? null,
      metacritic: row.metacritic ?? null,
      released: row.released ?? "",
      rawgStatus: row.rawgStatus ?? "",
      description: row.description ?? "",
      playtime: row.playtime ?? null,
      developers: row.developers ?? [],
      siteUrl: row.siteUrl ?? "",
      playStatus: row.playStatus,
      score: row.score ?? null,
      hoursPlayed: row.hoursPlayed ?? 0,
      favorite: !!row.favorite,
      notes: row.notes ?? "",
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}

function seedWeight(d: {
  playStatus: GamePlayStatus;
  favorite?: boolean;
  score?: number | null;
}): number {
  if (d.playStatus === "dropped") return 0;
  let w = 1;
  if (d.favorite) w += 3;
  if (d.playStatus === "completed") w += 2;
  else if (d.playStatus === "playing") w += 1.5;
  else if (d.playStatus === "paused") w += 0.8;
  else if (d.playStatus === "planned") w += 0.3;
  if (d.score != null) w += d.score / 5;
  return w;
}

function toCatalogItem(g: RawgGame): GameCatalogItemDto {
  const released = g.released ?? "";
  return {
    rawgId: g.id,
    title: g.name,
    coverImage: g.background_image ?? "",
    bannerImage: g.background_image_additional ?? g.background_image ?? "",
    genres: (g.genres ?? []).map((x) => x.name),
    platforms: (g.parent_platforms ?? []).map((p) => p.platform.name),
    rawgScore: g.rating ? Math.round(g.rating * 20) : null,
    metacritic: g.metacritic ?? null,
    released,
    rawgStatus: gameStatus(released, g.tba),
    description: stripHtml(g.description_raw ?? "").slice(0, 400),
    playtime: g.playtime ?? null,
  };
}

function snapshot(g: RawgGame) {
  const item = toCatalogItem(g);
  return {
    rawgId: g.id,
    title: g.name,
    coverImage: item.coverImage,
    bannerImage: item.bannerImage,
    genres: item.genres,
    platforms: item.platforms,
    rawgScore: item.rawgScore,
    metacritic: item.metacritic,
    released: item.released,
    rawgStatus: item.rawgStatus,
    description: stripHtml(g.description_raw ?? "").slice(0, 2000),
    developers: (g.developers ?? []).map((d) => d.name),
    siteUrl: g.website || `https://rawg.io/games/${g.slug}`,
    playtime: g.playtime ?? null,
  };
}

function gameStatus(released: string, tba?: boolean): string {
  if (tba || !released) return "TBA";
  const t = Date.parse(released);
  if (!Number.isFinite(t)) return "";
  if (t > Date.now()) return "COMING";
  const days = (Date.now() - t) / 86_400_000;
  if (days <= 21) return "NEW";
  return "RELEASED";
}

function buildBecause(sources: Set<string>, genresHit: Set<string>): string[] {
  const out = [...sources].slice(0, 3);
  for (const g of genresHit) {
    if (out.length >= 4) break;
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
