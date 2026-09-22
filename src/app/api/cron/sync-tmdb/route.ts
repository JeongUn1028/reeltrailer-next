import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/server/prisma";
import { CONTENTS_TAG } from "@/server/contents";
import {
  isFailureRateAcceptable,
  mergeNetflixProviders,
  NETFLIX_PROVIDER_ID,
  NETFLIX_WITH_ADS_PROVIDER_ID,
  parseDate,
  processInBatches,
  type BatchResult,
  type TMDBProvider,
} from "@/server/sync/helpers";
import { notifySyncResult } from "@/server/sync/notify";

//* Vercel 함수 실행 시간 상한(초). 600건 × 2~3 요청을 배치로 처리하면 수 분이 걸린다.
//* Hobby 플랜은 60초가 상한이므로 Fluid compute를 켜거나 TARGET_ITEM_COUNT를 줄여야 한다.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

//* 주요 OTT Providers IDs (Netflix: 8, Disney+: 337, Watcha: 97, Wavve: 356, Tving: 1883)
//* src/config/ott-provider-ids.json과 동일한 값을 유지해야 함
//* 1796(Netflix Standard with Ads)은 수집 범위에는 포함하되 저장 시 Netflix(8)로 병합함
const OTT_PROVIDER_IDS = `${NETFLIX_PROVIDER_ID}|${NETFLIX_WITH_ADS_PROVIDER_ID}|337|97|356|1883`;

//* 영화/TV 각각 목표로 수집할 개수 (TMDB discover는 페이지당 20개씩 반환)
const TARGET_ITEM_COUNT = 300;

//* 한 번에 병렬로 처리할 아이템 개수 (너무 크면 TMDB 레이트리밋에 걸릴 수 있음)
const BATCH_SIZE = 5;

//* 배치 사이에 대기할 시간 (ms) - TMDB API 레이트리밋 회피용
const BATCH_DELAY_MS = 500;

//* 이 비율을 넘게 실패하면 stale 콘텐츠 삭제를 건너뛴다 (일시적 장애로 데이터가 사라지는 것 방지)
const MAX_FAILURE_RATIO_FOR_CLEANUP = 0.1;

// -------------------------
// TMDB 응답 타입
// -------------------------

interface TMDBMovie {
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

interface TMDBTVShow {
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

interface TmdbGenreResponse {
  genres: { id: number; name: string }[];
}

// -------------------------
// TMDB 요청 헬퍼
// -------------------------

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY ?? "");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TMDB ${path} 요청 실패 (${res.status})`);
  }
  return (await res.json()) as T;
}

//* 장르 목록 동기화 (영화/TV upsert 시 genre connect가 실패하지 않도록 먼저 실행)
async function syncGenres() {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<TmdbGenreResponse>("/genre/movie/list", { language: "ko-KR" }),
    tmdbFetch<TmdbGenreResponse>("/genre/tv/list", { language: "ko-KR" }),
  ]);

  const genreMap = new Map<number, string>();
  for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
    genreMap.set(genre.id, genre.name);
  }

  await Promise.all(
    Array.from(genreMap.entries()).map(([id, name]) =>
      prisma.genre.upsert({ where: { id }, update: { name }, create: { id, name } }),
    ),
  );

  return genreMap.size;
}

//* 예고편 키 조회: 한국어 → 영어 순으로 YouTube Trailer를 찾고, 없으면 첫 영상
async function fetchTrailerKey(type: "movie" | "tv", id: number): Promise<string | null> {
  type Video = { key: string; site: string; type: string };
  const fetchVideos = async (language: string): Promise<Video[]> => {
    try {
      const data = await tmdbFetch<{ results?: Video[] }>(`/${type}/${id}/videos`, { language });
      return data.results ?? [];
    } catch (error) {
      console.error(`[sync] ${type}/${id} 영상 조회 실패 (${language}):`, error);
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

//* discover API를 여러 페이지 순회하며 targetCount만큼 모은다 (페이지당 20개)
async function fetchDiscoverPages<T>(type: "movie" | "tv", targetCount: number): Promise<T[]> {
  const results: T[] = [];
  const maxPages = Math.ceil(targetCount / 20);

  for (let page = 1; page <= maxPages; page++) {
    const data = await tmdbFetch<{ results?: T[]; total_pages?: number }>(`/discover/${type}`, {
      language: "ko-KR",
      watch_region: "KR",
      with_watch_monetization_types: "flatrate",
      with_watch_providers: OTT_PROVIDER_IDS,
      sort_by: "popularity.desc",
      page: String(page),
    });
    const pageResults = data.results ?? [];
    if (pageResults.length === 0) break;
    results.push(...pageResults);
    if (data.total_pages && page >= data.total_pages) break;
  }

  return results.slice(0, targetCount);
}

//* 한국 flatrate 제공자 조회 (Netflix 광고형은 Netflix로 병합)
async function fetchKrFlatrateProviders(type: "movie" | "tv", id: number): Promise<TMDBProvider[]> {
  const data = await tmdbFetch<{ results?: { KR?: { flatrate?: TMDBProvider[] } } }>(
    `/${type}/${id}/watch/providers`,
  );
  return mergeNetflixProviders(data.results?.KR?.flatrate ?? []);
}

// -------------------------
// DB 저장
// -------------------------

//* WatchProvider 마스터를 upsert하고, 콘텐츠-제공자 관계를 현재 목록과 동일하게 맞춘다
//* (새 관계는 createMany, 더 이상 제공하지 않는 관계는 삭제)
async function syncWatchProviders(
  providers: TMDBProvider[],
  target: { type: "movie" | "tv"; id: number },
) {
  await Promise.all(
    providers.map((provider) =>
      prisma.watchProvider.upsert({
        where: { id: provider.provider_id },
        update: {
          providerName: provider.provider_name,
          logoPath: provider.logo_path,
          displayPriority: provider.display_priority,
        },
        create: {
          id: provider.provider_id,
          providerName: provider.provider_name,
          logoPath: provider.logo_path,
          displayPriority: provider.display_priority,
        },
      }),
    ),
  );

  const providerIds = providers.map((p) => p.provider_id);

  if (target.type === "movie") {
    await prisma.moviesOnWatchProviders.deleteMany({
      where: { movieId: target.id, providerId: { notIn: providerIds } },
    });
    await prisma.moviesOnWatchProviders.createMany({
      data: providerIds.map((providerId) => ({ movieId: target.id, providerId })),
      skipDuplicates: true,
    });
  } else {
    await prisma.tvShowsOnWatchProviders.deleteMany({
      where: { tvShowId: target.id, providerId: { notIn: providerIds } },
    });
    await prisma.tvShowsOnWatchProviders.createMany({
      data: providerIds.map((providerId) => ({ tvShowId: target.id, providerId })),
      skipDuplicates: true,
    });
  }
}

//* 영화 한 편 처리: 제공자 확인 → upsert → 제공자 관계 저장
async function processMovie(movie: TMDBMovie) {
  const providers = await fetchKrFlatrateProviders("movie", movie.id);
  // 한국 OTT 제공자가 없으면 저장하지 않는다
  if (providers.length === 0) return;

  const trailerKey = await fetchTrailerKey("movie", movie.id);
  const data = {
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    trailerKey,
    releaseDate: parseDate(movie.release_date),
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
  };
  const genreCreate = movie.genre_ids.map((genreId) => ({ genre: { connect: { id: genreId } } }));

  await prisma.movie.upsert({
    where: { id: movie.id },
    update: { ...data, genres: { deleteMany: {}, create: genreCreate } },
    create: { id: movie.id, ...data, genres: { create: genreCreate } },
  });

  await syncWatchProviders(providers, { type: "movie", id: movie.id });
}

//* TV 프로그램 한 편 처리
async function processTvShow(tvShow: TMDBTVShow) {
  const providers = await fetchKrFlatrateProviders("tv", tvShow.id);
  if (providers.length === 0) return;

  const trailerKey = await fetchTrailerKey("tv", tvShow.id);
  const data = {
    title: tvShow.name,
    originalTitle: tvShow.original_name,
    overview: tvShow.overview,
    posterPath: tvShow.poster_path,
    backdropPath: tvShow.backdrop_path,
    trailerKey,
    firstAirDate: parseDate(tvShow.first_air_date),
    voteAverage: tvShow.vote_average,
    voteCount: tvShow.vote_count,
    popularity: tvShow.popularity,
  };
  const genreCreate = tvShow.genre_ids.map((genreId) => ({ genre: { connect: { id: genreId } } }));

  await prisma.tvShow.upsert({
    where: { id: tvShow.id },
    update: { ...data, genres: { deleteMany: {}, create: genreCreate } },
    create: { id: tvShow.id, ...data, genres: { create: genreCreate } },
  });

  await syncWatchProviders(providers, { type: "tv", id: tvShow.id });
}

//* 이번 동기화에서 갱신되지 않은(= TMDB 인기 목록/국내 OTT에서 빠진) 콘텐츠 삭제.
//* 실패율이 높으면 일시적 장애일 수 있으므로 건너뛴다.
async function removeStaleContents(
  type: "movie" | "tv",
  syncStartedAt: Date,
  result: BatchResult,
): Promise<number> {
  if (!isFailureRateAcceptable(result, MAX_FAILURE_RATIO_FOR_CLEANUP)) {
    console.warn(`[sync] ${type} 실패율이 높아 stale 삭제를 건너뜁니다.`);
    return 0;
  }
  const where = { updatedAt: { lt: syncStartedAt } };
  const { count } =
    type === "movie"
      ? await prisma.movie.deleteMany({ where })
      : await prisma.tvShow.deleteMany({ where });
  return count;
}

// -------------------------
// 핸들러
// -------------------------

export async function GET(request: Request) {
  //* 1. Vercel Cron Security Key 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ message: "TMDB API Key is not set" }, { status: 500 });
  }

  const startedAt = new Date();

  try {
    const genreCount = await syncGenres();

    // 영화
    const movies = await fetchDiscoverPages<TMDBMovie>("movie", TARGET_ITEM_COUNT);
    const movieResult = await processInBatches(
      movies,
      BATCH_SIZE,
      BATCH_DELAY_MS,
      processMovie,
      (m) => `movie:${m.id} ${m.title}`,
    );
    const removedMovies = await removeStaleContents("movie", startedAt, movieResult);

    // TV 프로그램
    const tvShows = await fetchDiscoverPages<TMDBTVShow>("tv", TARGET_ITEM_COUNT);
    const tvResult = await processInBatches(
      tvShows,
      BATCH_SIZE,
      BATCH_DELAY_MS,
      processTvShow,
      (t) => `tv:${t.id} ${t.name}`,
    );
    const removedTvShows = await removeStaleContents("tv", startedAt, tvResult);

    // 이전 동기화에서 저장된 Netflix Standard with Ads(1796) 행 정리 (관계는 Cascade로 삭제)
    await prisma.watchProvider.deleteMany({ where: { id: NETFLIX_WITH_ADS_PROVIDER_ID } });

    // 카탈로그/상세 캐시 무효화
    revalidateTag(CONTENTS_TAG, "max");

    const errors = [...movieResult.errors, ...tvResult.errors];
    for (const error of errors) {
      console.error(`[sync] 실패: ${error.item} - ${error.message}`);
    }

    const durationMs = Date.now() - startedAt.getTime();
    const summary = {
      success: true,
      durationMs,
      genres: genreCount,
      movies: { fetched: movies.length, ...movieResult, removed: removedMovies },
      tvShows: { fetched: tvShows.length, ...tvResult, removed: removedTvShows },
    };

    await notifySyncResult({
      success: true,
      durationMs,
      movies: summary.movies,
      tvShows: summary.tvShows,
      errorSamples: errors.slice(0, 5).map((e) => `${e.item}: ${e.message}`),
    });

    return NextResponse.json({
      ...summary,
      movies: { ...summary.movies, errors: undefined },
      tvShows: { ...summary.tvShows, errors: undefined },
      failedItems: errors,
      timestamp: new Date().toISOString(),
      message: "TMDB Sync Completed",
    });
  } catch (error) {
    console.error("TMDB Sync Failed:", error);
    await notifySyncResult({
      success: false,
      durationMs: Date.now() - startedAt.getTime(),
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "TMDB Sync Failed" }, { status: 500 });
  }
}
