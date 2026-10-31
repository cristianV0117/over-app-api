import { Injectable, Logger } from "@nestjs/common";

const ANILIST_URL = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  type
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
  query ($search: String, $page: Int, $perPage: Int, $genre: String, $format: MediaFormat, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage lastPage }
      media(
        type: ANIME
        search: $search
        genre: $genre
        format: $format
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

const BROWSE_GENRES_QUERY = `
  query ($genres: [String], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: ANIME
        genre_in: $genres
        isAdult: false
        sort: [SCORE_DESC, POPULARITY_DESC]
      ) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

export type AnilistMedia = {
  id: number;
  type?: string | null;
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
    format?: string;
    sort?: string;
    page?: number;
  }): Promise<{ items: AnilistMedia[]; page: number; hasNextPage: boolean }> {
    const sort = opts.search?.trim()
      ? ["SEARCH_MATCH", opts.sort || "POPULARITY_DESC"]
      : [opts.sort || "POPULARITY_DESC"];
    const data = await this.request<{
      Page: {
        pageInfo: { currentPage: number; hasNextPage: boolean };
        media: AnilistMedia[];
      };
    }>(SEARCH_QUERY, {
      search: opts.search?.trim() || undefined,
      genre: opts.genre?.trim() || undefined,
      format: opts.format?.trim() || undefined,
      page: opts.page ?? 1,
      perPage: 24,
      sort,
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

  async browseByGenres(genres: string[], perPage = 20): Promise<AnilistMedia[]> {
    if (!genres.length) return [];
    const data = await this.request<{
      Page: { media: AnilistMedia[] };
    }>(BROWSE_GENRES_QUERY, {
      genres: genres.slice(0, 1),
      page: 1,
      perPage,
    });
    return data.Page.media ?? [];
  }

  async recommendationsFor(
    ids: number[]
  ): Promise<
    { sourceId: number; sourceTitle: string; rating: number; media: AnilistMedia }[]
  > {
    const unique = [...new Set(ids)].slice(0, 12);
    const out: {
      sourceId: number;
      sourceTitle: string;
      rating: number;
      media: AnilistMedia;
    }[] = [];
    for (let i = 0; i < unique.length; i += 6) {
      const chunk = unique.slice(i, i + 6);
      const fields = chunk
        .map(
          (_, idx) => `
        m${idx}: Media(id: $id${idx}, type: ANIME) {
          id
          title { romaji english }
          recommendations(sort: RATING_DESC, perPage: 10) {
            nodes {
              rating
              mediaRecommendation { ${MEDIA_FIELDS} }
            }
          }
        }`
        )
        .join("\n");
      const varsDecl = chunk.map((_, idx) => `$id${idx}: Int!`).join(", ");
      const variables: Record<string, number> = {};
      chunk.forEach((id, idx) => {
        variables[`id${idx}`] = id;
      });
      const data = await this.request<
        Record<
          string,
          {
            id: number;
            title: { romaji: string | null; english: string | null };
            recommendations: {
              nodes: {
                rating: number;
                mediaRecommendation: AnilistMedia | null;
              }[];
            };
          } | null
        >
      >(`query Recs(${varsDecl}) { ${fields} }`, variables);
      for (let idx = 0; idx < chunk.length; idx++) {
        const node = data[`m${idx}`];
        if (!node) continue;
        const sourceTitle =
          node.title.romaji || node.title.english || String(node.id);
        for (const rec of node.recommendations?.nodes ?? []) {
          if (!rec.mediaRecommendation) continue;
          if (rec.mediaRecommendation.type && rec.mediaRecommendation.type !== "ANIME") {
            continue;
          }
          out.push({
            sourceId: node.id,
            sourceTitle,
            rating: rec.rating ?? 0,
            media: rec.mediaRecommendation,
          });
        }
      }
    }
    return out;
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
