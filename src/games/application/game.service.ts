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
import { SteamClient, SteamGame } from "./steam.client";
import { GameAddDto } from "../infrastructure/dtos/game-add.dto";
import { GameUpdateDto } from "../infrastructure/dtos/game-update.dto";

export type GameCatalogItemDto = {
  steamId: number;
  title: string;
  coverImage: string;
  bannerImage: string;
  genres: string[];
  platforms: string[];
  steamScore: number | null;
  metacritic: number | null;
  released: string;
  steamStatus: string;
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
    private readonly steam: SteamClient
  ) {}

  async search(
    q: string,
    page = 1,
    opts: { genre?: string; platform?: string; sort?: string; mainOnly?: boolean } = {}
  ) {
    const res = await this.steam.search({
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
    return this.steam.genres();
  }

  async detail(steamId: number): Promise<GameDetailDto> {
    if (!Number.isFinite(steamId) || steamId <= 0) {
      throw new NotFoundException("No se encontró el juego en Steam");
    }
    const game = await this.steam.getById(steamId);
    if (!game) throw new NotFoundException("No se encontró el juego en Steam");
    const snap = snapshot(game);
    let series: SteamGame[] = [];
    let extras: SteamGame[] = [];
    try {
      [series, extras] = await Promise.all([
        this.steam.seriesSearch(game.name, steamId),
        this.steam.extras(game.dlc),
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
        series: series.filter((g) => g.id !== steamId).map(toCatalogItem),
        extras: extras.filter((g) => g.id !== steamId).map(toCatalogItem),
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
      .map((d) => `${d.steamAppId}:${d.playStatus}:${d.score ?? ""}:${d.favorite ? 1 : 0}`)
      .sort()
      .join("|");
    const cached = this.recCache.get(`${userId}:${cacheKey}`);
    if (cached && Date.now() - cached.at < 10 * 60_000) return cached.data;

    const owned = new Set(docs.map((d) => d.steamAppId));
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
      .map(([g]) => toSteamGenreSlug(g));

    const acc = new Map<
      number,
      { game: SteamGame; score: number; sources: Set<string>; genresHit: Set<string> }
    >();
    const bump = (game: SteamGame, add: number, source?: string, genresHit?: string[]) => {
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

    for (const slug of topGenres.filter(Boolean)) {
      try {
        const res = await this.steam.search({
          genre: slug,
          page: 1,
          mainOnly: true,
          sort: "SCORE_DESC",
        });
        for (const game of res.items) {
          const overlap = (game.genres ?? []).filter((g) => genreWeight.has(g));
          bump(game, 6, undefined, overlap.length ? overlap : [slug]);
        }
      } catch {
        /* skip */
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

  async list(userId: string): Promise<GameEntryDto[]> {
    const docs = await this.entries
      .find({ userId: new Types.ObjectId(userId) })
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
      .findOne({ userId: uid, steamAppId: body.steamId })
      .lean()
      .exec();
    if (existing) throw new ConflictException("Ese juego ya está en tu biblioteca");
    const game = await this.steam.getById(body.steamId);
    if (!game) throw new NotFoundException("No se encontró el juego en Steam");
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
      steamId: row.steamAppId,
      title: row.title,
      coverImage: row.coverImage ?? "",
      bannerImage: row.bannerImage ?? "",
      genres: row.genres ?? [],
      platforms: row.platforms ?? [],
      steamScore: row.steamScore ?? null,
      metacritic: row.metacritic ?? null,
      released: row.released ?? "",
      steamStatus: row.steamStatus ?? "",
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

function toCatalogItem(g: SteamGame): GameCatalogItemDto {
  return {
    steamId: g.id,
    title: g.name,
    coverImage: g.coverImage,
    bannerImage: g.bannerImage,
    genres: g.genres,
    platforms: g.platforms,
    steamScore: g.score,
    metacritic: g.score,
    released: g.released,
    steamStatus: g.comingSoon ? "COMING" : gameStatus(g.released),
    description: g.description.slice(0, 400),
    playtime: null,
  };
}

function snapshot(g: SteamGame) {
  const item = toCatalogItem(g);
  return {
    steamAppId: g.id,
    title: g.name,
    coverImage: item.coverImage,
    bannerImage: item.bannerImage,
    genres: item.genres,
    platforms: item.platforms,
    steamScore: item.steamScore,
    metacritic: item.metacritic,
    released: item.released,
    steamStatus: item.steamStatus,
    description: g.description.slice(0, 2000),
    developers: g.developers,
    siteUrl: g.website,
    playtime: null,
  };
}

function gameStatus(released: string): string {
  if (!released) return "";
  const t = Date.parse(released);
  if (!Number.isFinite(t)) return "";
  const days = (Date.now() - t) / 86_400_000;
  if (days < 0) return "COMING";
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

function toSteamGenreSlug(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("acci") || n === "action") return "Action";
  if (n.includes("aventura") || n === "adventure") return "Adventure";
  if (n.includes("rol") || n === "rpg") return "RPG";
  if (n.includes("estrateg")) return "Strategy";
  if (n.includes("simul")) return "Simulation";
  if (n.includes("deporte") || n === "sports") return "Sports";
  if (n.includes("carrera") || n === "racing") return "Racing";
  if (n.includes("indie")) return "Indie";
  if (n.includes("gratis") || n.includes("free")) return "Free to Play";
  return name;
}
