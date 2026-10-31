import { Injectable, Logger } from "@nestjs/common";

const ANILIST_URL = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large medium }
  bannerImage
  genres
  format
  episodes
  averageScore
  season
  seasonYear
  status
  description(asHtml: false)
  siteUrl
  studios(isMain: true) { nodes { name } }
`;

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage lastPage }
      media(
        type: ANIME
        search: $search
        genre: $genre
        isAdult: false
        sort: $sort
      ) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const MEDIA_QUERY = `
  query ($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
`;

const GENRES_QUERY = `query { GenreCollection }`;

export type AnilistMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { extraLarge?: string | null; large?: string | null; medium?: string | null };
  bannerImage: string | null;
  genres: string[];
  format: string | null;
  episodes: number | null;
  averageScore: number | null;
  season: string | null;
  seasonYear: number | null;
  status: string | null;
  description: string | null;
  siteUrl: string | null;
  studios: { nodes: { name: string }[] };
};

@Injectable()
export class AnilistClient {
  private readonly logger = new Logger(AnilistClient.name);

  async search(opts: {
    search?: string;
    genre?: string;
    page?: number;
  }): Promise<{ items: AnilistMedia[]; page: number; hasNextPage: boolean }> {
    const data = await this.request<{
      Page: {
        pageInfo: { currentPage: number; hasNextPage: boolean };
        media: AnilistMedia[];
      };
    }>(SEARCH_QUERY, {
      search: opts.search?.trim() || undefined,
      genre: opts.genre?.trim() || undefined,
      page: opts.page ?? 1,
      perPage: 24,
      sort: opts.search?.trim()
        ? ["SEARCH_MATCH", "POPULARITY_DESC"]
        : ["POPULARITY_DESC"],
    });
    return {
      items: data.Page.media ?? [],
      page: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
    };
  }

  async getById(id: number): Promise<AnilistMedia | null> {
    const data = await this.request<{ Media: AnilistMedia | null }>(
      MEDIA_QUERY,
      { id }
    );
    return data.Media;
  }

  async genres(): Promise<string[]> {
    const data = await this.request<{ GenreCollection: string[] }>(GENRES_QUERY);
    return (data.GenreCollection ?? []).filter(
      (g) => g && g.toLowerCase() !== "hentai"
    );
  }

  private async request<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        query,
        variables: Object.fromEntries(
          Object.entries(variables).filter(([, v]) => v !== undefined && v !== "")
        ),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`AniList HTTP ${res.status}: ${text.slice(0, 200)}`);
      throw new Error(`AniList HTTP ${res.status}`);
    }
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new Error(json.errors[0].message);
    }
    if (!json.data) throw new Error("AniList sin datos");
    return json.data;
  }
}
