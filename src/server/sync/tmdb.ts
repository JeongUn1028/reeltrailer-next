//* TMDB API 클라이언트. Cron 라우트와 백필 스크립트가 공유한다.
import { mergeNetflixProviders, NETFLIX_PROVIDER_ID, NETFLIX_WITH_ADS_PROVIDER_ID, type TMDBProvider } from "./helpers";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

//* 주요 OTT Providers IDs (Netflix: 8, Disney+: 337, Watcha: 97, Wavve: 356, Tving: 1883)
//* src/config/ott-provider-ids.json과 동일한 값을 유지해야 함
//* 1796(Netflix Standard with Ads)은 수집 범위에는 포함하되 저장 시 Netflix(8)로 병합함
export const OTT_PROVIDER_IDS = `${NETFLIX_PROVIDER_ID}|${NETFLIX_WITH_ADS_PROVIDER_ID}|337|97|356|1883`;

//* TMDB discover는 페이지당 20개, 최대 500페이지까지만 조회할 수 있다
export const DISCOVER_PAGE_SIZE = 20;
export const DISCOVER_MAX_PAGE = 500;

export type TmdbKind = "movie" | "tv";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export type TmdbItem<K extends TmdbKind> = K extends "movie" ? TMDBMovie : TMDBTVShow;

interface DiscoverResponse<T> {
  page: number;
  results?: T[];
  total_pages?: number;
  total_results?: number;
}

//* 응답 상태 코드로 분기할 수 있도록 status를 담는다 (예: 404는 TMDB에서 삭제된 작품)
export class TmdbRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`TMDB ${path} 요청 실패 (${status})`);
    this.name = "TmdbRequestError";
  }
}

export class TmdbClient {
  constructor(private readonly apiKey: string) {}

  async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    url.searchParams.set("api_key", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await globalThis.fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new TmdbRequestError(path, res.status);
    }
    return (await res.json()) as T;
  }

  //* 국내 OTT 구독형 discover 한 페이지. extraParams로 날짜 범위 등을 추가한다.
  async discoverPage<K extends TmdbKind>(
    kind: K,
    page: number,
    extraParams: Record<string, string> = {},
  ): Promise<DiscoverResponse<TmdbItem<K>>> {
    return this.fetch<DiscoverResponse<TmdbItem<K>>>(`/discover/${kind}`, {
      language: "ko-KR",
      watch_region: "KR",
      with_watch_monetization_types: "flatrate",
      with_watch_providers: OTT_PROVIDER_IDS,
      sort_by: "popularity.desc",
      page: String(page),
      ...extraParams,
    });
  }

  //* discover를 여러 페이지 순회하며 targetCount만큼 모은다
  async discoverMany<K extends TmdbKind>(
    kind: K,
    targetCount: number,
    extraParams: Record<string, string> = {},
  ): Promise<TmdbItem<K>[]> {
    const results: TmdbItem<K>[] = [];
    const maxPages = Math.min(DISCOVER_MAX_PAGE, Math.ceil(targetCount / DISCOVER_PAGE_SIZE));

    for (let page = 1; page <= maxPages; page++) {
      const data = await this.discoverPage(kind, page, extraParams);
      const pageResults = data.results ?? [];
      if (pageResults.length === 0) break;
      results.push(...pageResults);
      if (data.total_pages && page >= data.total_pages) break;
    }

    return results.slice(0, targetCount);
  }

  //* 한국 flatrate 제공자 조회 (Netflix 광고형은 Netflix로 병합)
  async fetchKrFlatrateProviders(kind: TmdbKind, id: number): Promise<TMDBProvider[]> {
    const data = await this.fetch<{ results?: { KR?: { flatrate?: TMDBProvider[] } } }>(
      `/${kind}/${id}/watch/providers`,
    );
    return mergeNetflixProviders(data.results?.KR?.flatrate ?? []);
  }

  //* 예고편 키 조회: 한국어 → 영어 순으로 YouTube Trailer를 찾고, 없으면 첫 영상
  async fetchTrailerKey(kind: TmdbKind, id: number): Promise<string | null> {
    type Video = { key: string; site: string; type: string };
    const fetchVideos = async (language: string): Promise<Video[]> => {
      try {
        const data = await this.fetch<{ results?: Video[] }>(`/${kind}/${id}/videos`, { language });
        return data.results ?? [];
      } catch (error) {
        console.error(`[sync] ${kind}/${id} 영상 조회 실패 (${language}):`, error);
        return [];
      }
    };
    const isTrailer = (v: Video) => v.site === "YouTube" && v.type === "Trailer";

    let videos = await fetchVideos("ko-KR");
    let trailer = videos.find(isTrailer);
    if (!trailer) {
      videos = await fetchVideos("en-US");
      trailer = videos.find(isTrailer);
    }
    return trailer?.key ?? videos[0]?.key ?? null;
  }

  //* 영문(en-US) 제목. 한국 작품은 원제가 한글이라 영문 검색을 위해 별도로 저장한다
  async fetchEnglishTitle(kind: TmdbKind, id: number): Promise<string | null> {
    try {
      const data = await this.fetch<{ title?: string; name?: string }>(`/${kind}/${id}`, { language: "en-US" });
      return (kind === "movie" ? data.title : data.name) || null;
    } catch (error) {
      console.error(`[sync] ${kind}/${id} 영문 제목 조회 실패:`, error);
      return null;
    }
  }

  async fetchGenres(): Promise<Map<number, string>> {
    type GenreResponse = { genres: { id: number; name: string }[] };
    const [movieGenres, tvGenres] = await Promise.all([
      this.fetch<GenreResponse>("/genre/movie/list", { language: "ko-KR" }),
      this.fetch<GenreResponse>("/genre/tv/list", { language: "ko-KR" }),
    ]);
    const genreMap = new Map<number, string>();
    for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
      genreMap.set(genre.id, genre.name);
    }
    return genreMap;
  }
}
