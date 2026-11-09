import { Injectable, Logger } from "@nestjs/common";

const STORE = "https://store.steampowered.com";
const SPY = "https://steamspy.com/api.php";
const CDN = "https://cdn.akamai.steamstatic.com/steam/apps";
const EXTRA_RX =
  /\b(dlc|soundtrack|ost|demo|pack|bundle|artbook|season pass|upgrade|cosmetic)\b/i;

export const STEAM_GENRES = [
  { slug: "Action", name: "Acción" },
  { slug: "Adventure", name: "Aventura" },
  { slug: "RPG", name: "RPG" },
  { slug: "Strategy", name: "Estrategia" },
  { slug: "Simulation", name: "Simulación" },
  { slug: "Sports", name: "Deportes" },
  { slug: "Racing", name: "Carreras" },
  { slug: "Casual", name: "Casual" },
  { slug: "Indie", name: "Indie" },
  { slug: "Early Access", name: "Acceso anticipado" },
  { slug: "Free to Play", name: "Gratis" },
  { slug: "Massively Multiplayer", name: "Multijugador masivo" },
] as const;

export type SteamGame = {
  id: number;
  name: string;
  type: string;
  coverImage: string;
  bannerImage: string;
  genres: string[];
  platforms: string[];
  score: number | null;
  released: string;
  comingSoon: boolean;
  description: string;
  developers: string[];
  website: string;
  dlc: number[];
};

@Injectable()
export class SteamClient {
  private readonly logger = new Logger(SteamClient.name);
  private readonly detailCache = new Map<number, { at: number; game: SteamGame | null }>();

  async search(opts: {
    search?: string;
    page?: number;
    genre?: string;
    platform?: string;
    sort?: string;
    mainOnly?: boolean;
  }): Promise<{ items: SteamGame[]; page: number; lastPage: number; hasNextPage: boolean }> {
    const page = Math.max(1, opts.page ?? 1);
    const q = opts.search?.trim() ?? "";
    let items: SteamGame[] = [];
    if (q) {
      items = await this.storeSearch(q);
    } else if (opts.genre?.trim()) {
      items = await this.spyGenre(opts.genre.trim());
    } else {
      items = await this.browsePopular(opts.sort);
    }
    if (opts.mainOnly) items = items.filter(isMainGame);
    if (opts.platform) {
      const want = platformName(opts.platform);
      if (want) items = items.filter((g) => g.platforms.includes(want) || g.platforms.length === 0);
    }
    items = uniqueById(items);
    if (opts.sort === "SCORE_DESC") {
      items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }
    const perPage = 24;
    const lastPage = Math.max(1, Math.ceil(items.length / perPage));
    const slice = items.slice((page - 1) * perPage, page * perPage);
    return {
      items: slice,
      page: Math.min(page, lastPage),
      lastPage,
      hasNextPage: page < lastPage,
    };
  }

  genres() {
    return STEAM_GENRES.map((g) => ({ name: g.name, slug: g.slug }));
  }

  async getById(id: number): Promise<SteamGame | null> {
    const cached = this.detailCache.get(id);
    if (cached && Date.now() - cached.at < 30 * 60_000) return cached.game;
    const game = await this.appDetails(id);
    this.detailCache.set(id, { at: Date.now(), game });
    return game;
  }

  async extras(ids: number[]): Promise<SteamGame[]> {
    const unique = [...new Set(ids)].slice(0, 10);
    const out: SteamGame[] = [];
    for (const id of unique) {
      const g = await this.getById(id);
      if (g) out.push(g);
    }
    return out;
  }

  async seriesSearch(title: string, excludeId: number): Promise<SteamGame[]> {
    const seed = title.split(/[:\-–]/)[0]?.trim() || title;
    if (seed.length < 3) return [];
    const items = await this.storeSearch(seed);
    return items.filter((g) => g.id !== excludeId && isMainGame(g)).slice(0, 12);
  }

  private async storeSearch(term: string): Promise<SteamGame[]> {
    const url = `${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&l=spanish&cc=US`;
    const data = await this.getJson<{
      items?: {
        id: number;
        name: string;
        tiny_image?: string;
        metascore?: string;
        platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
        type?: string;
      }[];
    }>(url);
    return (data?.items ?? []).map((it) =>
      toLite(it.id, it.name, {
        score: Number(it.metascore) || null,
        platforms: platformsFromFlags(it.platforms),
        type: it.type === "dlc" ? "dlc" : "game",
      })
    );
  }

  private async browsePopular(sort?: string): Promise<SteamGame[]> {
    if (sort === "START_DATE_DESC") {
      const featured = await this.featured();
      return [...featured.coming, ...featured.news, ...featured.sellers];
    }
    const [featured, top] = await Promise.all([this.featured(), this.spyTop()]);
    if (sort === "TRENDING_DESC") return uniqueById([...top, ...featured.sellers]);
    return uniqueById([...featured.sellers, ...featured.news, ...top]);
  }

  private async featured(): Promise<{
    sellers: SteamGame[];
    news: SteamGame[];
    coming: SteamGame[];
  }> {
    const data = await this.getJson<Record<string, { items?: FeaturedItem[] }>>(
      `${STORE}/api/featuredcategories/?l=spanish&cc=US`
    );
    const map = (key: string) =>
      (data?.[key]?.items ?? []).map((it) =>
        toLite(Number(it.id), it.name, { banner: it.header_image })
      );
    return {
      sellers: map("top_sellers"),
      news: map("new_releases"),
      coming: map("coming_soon"),
    };
  }

  private async spyTop(): Promise<SteamGame[]> {
    const data = await this.getJson<Record<string, SpyApp>>(
      `${SPY}?request=top100in2weeks`
    );
    return spyToGames(data).slice(0, 100);
  }

  private async spyGenre(genre: string): Promise<SteamGame[]> {
    const data = await this.getJson<Record<string, SpyApp>>(
      `${SPY}?request=genre&genre=${encodeURIComponent(genre)}`
    );
    return spyToGames(data)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 240);
  }

  private async appDetails(id: number): Promise<SteamGame | null> {
    const data = await this.getJson<
      Record<string, { success?: boolean; data?: SteamDetails }>
    >(`${STORE}/api/appdetails?appids=${id}&l=spanish`);
    const row = data?.[String(id)];
    if (!row?.success || !row.data) return null;
    const d = row.data;
    const coming = !!d.release_date?.coming_soon;
    return {
      id: d.steam_appid || id,
      name: d.name,
      type: d.type || "game",
      coverImage: coverUrl(id),
      bannerImage: d.header_image || headerUrl(id),
      genres: (d.genres ?? []).map((g) => g.description).filter(Boolean),
      platforms: platformsFromFlags(d.platforms),
      score: d.metacritic?.score ?? null,
      released: d.release_date?.date ?? "",
      comingSoon: coming,
      description: stripHtml(d.short_description || d.about_the_game || ""),
      developers: d.developers ?? [],
      website: d.website || `https://store.steampowered.com/app/${id}`,
      dlc: d.dlc ?? [],
    };
  }

  private async getJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "OverApp/1.0",
        },
      });
      if (!res.ok) {
        this.logger.warn(`Steam HTTP ${res.status} ${url}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      this.logger.warn(`Steam fetch ${url}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}

type FeaturedItem = { id: number | string; name: string; header_image?: string };
type SpyApp = {
  appid?: number;
  name?: string;
  positive?: number;
  negative?: number;
  ccu?: number;
};
type SteamDetails = {
  steam_appid: number;
  name: string;
  type?: string;
  header_image?: string;
  short_description?: string;
  about_the_game?: string;
  website?: string | null;
  developers?: string[];
  genres?: { description: string }[];
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
  release_date?: { coming_soon?: boolean; date?: string };
  metacritic?: { score: number };
  dlc?: number[];
};

export function isMainGame(g: SteamGame): boolean {
  if (g.type && g.type !== "game" && g.type !== "app") return false;
  return !EXTRA_RX.test(g.name ?? "");
}

function spyToGames(data: Record<string, SpyApp> | null): SteamGame[] {
  if (!data) return [];
  return Object.values(data)
    .filter((x) => x?.appid && x?.name)
    .map((x) => {
      const tot = (x.positive ?? 0) + (x.negative ?? 0);
      const score = tot > 20 ? Math.round(((x.positive ?? 0) / tot) * 100) : null;
      return toLite(x.appid as number, x.name as string, { score });
    });
}

function toLite(
  id: number,
  name: string,
  extra: Partial<SteamGame> & { banner?: string } = {}
): SteamGame {
  return {
    id,
    name,
    type: extra.type || "game",
    coverImage: coverUrl(id),
    bannerImage: extra.banner || extra.bannerImage || headerUrl(id),
    genres: extra.genres ?? [],
    platforms: extra.platforms ?? [],
    score: extra.score ?? null,
    released: extra.released ?? "",
    comingSoon: extra.comingSoon ?? false,
    description: extra.description ?? "",
    developers: extra.developers ?? [],
    website: extra.website || `https://store.steampowered.com/app/${id}`,
    dlc: extra.dlc ?? [],
  };
}

function coverUrl(id: number) {
  return `${CDN}/${id}/library_600x900.jpg`;
}
function headerUrl(id: number) {
  return `${CDN}/${id}/header.jpg`;
}

function platformsFromFlags(p?: { windows?: boolean; mac?: boolean; linux?: boolean }) {
  if (!p) return [];
  const out: string[] = [];
  if (p.windows) out.push("Windows");
  if (p.mac) out.push("Mac");
  if (p.linux) out.push("Linux");
  return out;
}

function platformName(id: string): string | null {
  if (id === "windows" || id === "1") return "Windows";
  if (id === "mac") return "Mac";
  if (id === "linux") return "Linux";
  return null;
}

function uniqueById(items: SteamGame[]): SteamGame[] {
  const seen = new Set<number>();
  return items.filter((g) => {
    if (!g.id || seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
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
