import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

const RAWG_URL = "https://api.rawg.io/api";
const EXTRA_RX =
  /\b(dlc|ost|soundtrack|demo|pack|bundle|artbook|season pass|expansion pass|pre[- ]?order)\b/i;

export type RawgGenre = { id: number; name: string; slug: string };
export type RawgPlatform = { platform: { id: number; name: string } };

export type RawgGame = {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  background_image_additional?: string | null;
  rating: number | null;
  metacritic: number | null;
  released: string | null;
  tba: boolean;
  playtime: number | null;
  description_raw?: string | null;
  website?: string | null;
  genres?: RawgGenre[];
  parent_platforms?: RawgPlatform[];
  developers?: { name: string }[];
  tags?: { slug: string; name: string }[];
};

type Paged<T> = { count: number; next: string | null; results: T[] };

@Injectable()
export class RawgClient {
  private readonly logger = new Logger(RawgClient.name);

  private key(): string {
    const key = process.env.RAWG_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        "Falta RAWG_API_KEY en el servidor. Crea una gratis en https://rawg.io/apidocs"
      );
    }
    return key;
  }

  async search(opts: {
    search?: string;
    page?: number;
    genre?: string;
    platform?: string;
    sort?: string;
    mainOnly?: boolean;
  }): Promise<{ items: RawgGame[]; page: number; lastPage: number; hasNextPage: boolean }> {
    const page = Math.max(1, opts.page ?? 1);
    const ordering = mapSort(opts.sort, !!opts.search?.trim());
    const params: Record<string, string> = {
      page: String(page),
      page_size: "24",
      ordering,
    };
    if (opts.search?.trim()) params.search = opts.search.trim();
    if (opts.genre?.trim()) params.genres = opts.genre.trim();
    if (opts.platform?.trim()) params.parent_platforms = opts.platform.trim();
    const data = await this.get<Paged<RawgGame>>("/games", params);
    const raw = data.results ?? [];
    const items = opts.mainOnly ? raw.filter(isMainGame) : raw;
    const count = data.count ?? 0;
    const lastPage = Math.max(1, Math.ceil(count / 24));
    return {
      items,
      page,
      lastPage,
      hasNextPage: Boolean(data.next),
    };
  }

  async getById(id: number): Promise<RawgGame | null> {
    try {
      return await this.get<RawgGame>(`/games/${id}`);
    } catch (e) {
      this.logger.warn(`RAWG getById ${id}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async genres(): Promise<{ name: string; slug: string }[]> {
    const data = await this.get<Paged<RawgGenre>>("/genres", { page_size: "40" });
    return (data.results ?? []).map((g) => ({ name: g.name, slug: g.slug }));
  }

  async series(id: number): Promise<RawgGame[]> {
    return this.listAll(`/games/${id}/game-series`);
  }

  async additions(id: number): Promise<RawgGame[]> {
    return this.listAll(`/games/${id}/additions`);
  }

  async suggested(id: number, pageSize = 12): Promise<RawgGame[]> {
    const data = await this.get<Paged<RawgGame>>(`/games/${id}/suggested`, {
      page_size: String(pageSize),
    });
    return data.results ?? [];
  }

  async browseByGenres(slugs: string[], pageSize = 20): Promise<RawgGame[]> {
    if (!slugs.length) return [];
    const data = await this.get<Paged<RawgGame>>("/games", {
      genres: slugs.slice(0, 2).join(","),
      ordering: "-rating",
      page_size: String(pageSize),
    });
    return data.results ?? [];
  }

  private async listAll(path: string): Promise<RawgGame[]> {
    const data = await this.get<Paged<RawgGame>>(path, { page_size: "20" });
    return data.results ?? [];
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams({ key: this.key(), ...params });
    const res = await fetch(`${RAWG_URL}${path}?${qs.toString()}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`RAWG HTTP ${res.status}: ${text.slice(0, 200)}`);
      throw new Error(`RAWG HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }
}

export function isMainGame(g: RawgGame): boolean {
  if (EXTRA_RX.test(g.name ?? "")) return false;
  const tags = (g.tags ?? []).map((t) => t.slug);
  if (tags.includes("dlc") || tags.includes("mod")) return false;
  return true;
}

function mapSort(sort?: string, searching = false): string {
  if (searching && !sort) return "";
  switch (sort) {
    case "SCORE_DESC":
      return "-rating";
    case "TRENDING_DESC":
      return "-added";
    case "START_DATE_DESC":
      return "-released";
    case "POPULARITY_DESC":
    default:
      return searching ? "" : "-added";
  }
}
