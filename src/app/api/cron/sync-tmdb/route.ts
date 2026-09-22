import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/server/prisma";
import { CONTENTS_TAG } from "@/server/contents";
import { NETFLIX_WITH_ADS_PROVIDER_ID, processInBatches } from "@/server/sync/helpers";
import { TmdbClient } from "@/server/sync/tmdb";
import { processMovie, processTvShow, syncGenres, syncWatchProviders } from "@/server/sync/process";
import { chooseRecheckBudget, splitRecheckResults, type RecheckResult } from "@/server/sync/recheck";
import { notifySyncResult } from "@/server/sync/notify";

//* Vercel 함수 실행 시간 상한(초). Hobby 플랜은 Fluid compute를 켜야 300초까지 허용된다.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

//* 일일 "증분" 동기화. 전체 카탈로그(수만 건)는 로컬 백필 스크립트(scripts/backfill-tmdb.ts)로 넣고,
//* Cron은 아래 세 단계만 실행 시간 예산 안에서 처리한다.
//*  1) 현재 인기 상위 (영화/TV 각 POPULAR_COUNT건)
//*  2) 최근 RECENT_DAYS일 신작 (영화/TV 각 RECENT_COUNT건)
//*  3) 가장 오래전에 확인한 콘텐츠 순환 재검증 — 국내 OTT 제공이 끝났으면 삭제
const POPULAR_COUNT = 300;
const RECENT_COUNT = 300;
const RECENT_DAYS = 30;

//* 재검증 한도 (제공자 요청 1개/건). 남은 시간에 맞춰 줄어든다
const RECHECK_MAX = 800;
const RECHECK_MS_PER_REQUEST = 120;

//* 병렬 처리 크기와 배치 간 대기 (TMDB 소프트 리밋 ~40 req/s 아래로 유지)
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 400;

//* 전체 예산에서 재검증에 남겨둘 최소 시간과 안전 마진
const TIME_BUDGET_MS = (maxDuration - 20) * 1000;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: Request) {
  //* 1. Vercel Cron Security Key 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "TMDB API Key is not set" }, { status: 500 });
  }

  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;
  const tmdb = new TmdbClient(apiKey);
  const deps = { prisma, tmdb };

  try {
    const genreCount = await syncGenres(deps);

    // ---------- 1) 인기 + 2) 최근 신작 목록 수집 (중복 제거) ----------
    const since = isoDate(new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000));
    const [popularMovies, recentMovies, popularTv, recentTv] = await Promise.all([
      tmdb.discoverMany("movie", POPULAR_COUNT),
      tmdb.discoverMany("movie", RECENT_COUNT, { "primary_release_date.gte": since }),
      tmdb.discoverMany("tv", POPULAR_COUNT),
      tmdb.discoverMany("tv", RECENT_COUNT, { "first_air_date.gte": since }),
    ]);
    const movies = dedupeById([...popularMovies, ...recentMovies]);
    const tvShows = dedupeById([...popularTv, ...recentTv]);

    const movieResult = await processInBatches(
      movies,
      BATCH_SIZE,
      BATCH_DELAY_MS,
      (m) => processMovie(deps, m).then(() => undefined),
      (m) => `movie:${m.id} ${m.title}`,
    );
    const tvResult = await processInBatches(
      tvShows,
      BATCH_SIZE,
      BATCH_DELAY_MS,
      (t) => processTvShow(deps, t).then(() => undefined),
      (t) => `tv:${t.id} ${t.name}`,
    );

    // ---------- 3) 순환 재검증 ----------
    const budget = chooseRecheckBudget({
      remainingMs: TIME_BUDGET_MS - elapsed(),
      msPerRequest: RECHECK_MS_PER_REQUEST,
      max: RECHECK_MAX,
    });
    const recheck = await recheckOldest(deps, budget);

    // 이전 동기화에서 저장된 Netflix Standard with Ads(1796) 행 정리 (관계는 Cascade로 삭제)
    await prisma.watchProvider.deleteMany({ where: { id: NETFLIX_WITH_ADS_PROVIDER_ID } });

    // 카탈로그/상세 캐시 무효화
    revalidateTag(CONTENTS_TAG, "max");

    const errors = [...movieResult.errors, ...tvResult.errors];
    for (const error of errors) {
      console.error(`[sync] 실패: ${error.item} - ${error.message}`);
    }

    const durationMs = elapsed();
    const summary = {
      success: true,
      durationMs,
      genres: genreCount,
      movies: { fetched: movies.length, succeeded: movieResult.succeeded, failed: movieResult.failed },
      tvShows: { fetched: tvShows.length, succeeded: tvResult.succeeded, failed: tvResult.failed },
      recheck,
    };

    await notifySyncResult({
      success: true,
      durationMs,
      movies: { ...summary.movies, removed: recheck.movies.removed },
      tvShows: { ...summary.tvShows, removed: recheck.tvShows.removed },
      message: `재검증 ${recheck.checked}건 (실패 ${recheck.failed})`,
      errorSamples: errors.slice(0, 5).map((e) => `${e.item}: ${e.message}`),
    });

    return NextResponse.json({
      ...summary,
      failedItems: errors,
      timestamp: new Date().toISOString(),
      message: "TMDB Sync Completed",
    });
  } catch (error) {
    console.error("TMDB Sync Failed:", error);
    await notifySyncResult({
      success: false,
      durationMs: elapsed(),
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "TMDB Sync Failed" }, { status: 500 });
  }
}

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Map<number, T>();
  for (const item of items) if (!seen.has(item.id)) seen.set(item.id, item);
  return Array.from(seen.values());
}

//* updatedAt이 가장 오래된 콘텐츠부터 budget건의 제공자를 다시 조회한다.
//* 제공자가 없으면 삭제, 있으면 관계를 갱신하고 updatedAt을 지금으로 올려 순환에서 뒤로 보낸다.
async function recheckOldest(
  deps: { prisma: typeof prisma; tmdb: TmdbClient },
  budget: number,
) {
  const empty = { checked: 0, failed: 0, movies: { removed: 0 }, tvShows: { removed: 0 } };
  if (budget <= 0) return empty;

  // 영화/TV를 DB 비율대로 나눠 가져온다
  const [movieTotal, tvTotal] = await Promise.all([deps.prisma.movie.count(), deps.prisma.tvShow.count()]);
  const total = movieTotal + tvTotal;
  if (total === 0) return empty;
  const movieBudget = Math.round((budget * movieTotal) / total);
  const tvBudget = budget - movieBudget;

  const [oldMovies, oldTvShows] = await Promise.all([
    deps.prisma.movie.findMany({ select: { id: true }, orderBy: { updatedAt: "asc" }, take: movieBudget }),
    deps.prisma.tvShow.findMany({ select: { id: true }, orderBy: { updatedAt: "asc" }, take: tvBudget }),
  ]);

  const run = async (kind: "movie" | "tv", ids: number[]) => {
    const results: RecheckResult[] = [];
    await processInBatches(ids, BATCH_SIZE, BATCH_DELAY_MS, async (id) => {
      try {
        results.push({ id, providers: await deps.tmdb.fetchKrFlatrateProviders(kind, id) });
      } catch (error) {
        results.push({ id, error });
      }
    });
    const { toDelete, toKeep, failed } = splitRecheckResults(results);

    if (kind === "movie") {
      await deps.prisma.movie.deleteMany({ where: { id: { in: toDelete } } });
    } else {
      await deps.prisma.tvShow.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const { id, providers } of toKeep) {
      await syncWatchProviders(deps.prisma, providers, { kind, id });
      if (kind === "movie") {
        await deps.prisma.movie.update({ where: { id }, data: { updatedAt: new Date() } });
      } else {
        await deps.prisma.tvShow.update({ where: { id }, data: { updatedAt: new Date() } });
      }
    }
    return { removed: toDelete.length, failed: failed.length, checked: ids.length };
  };

  const [movies, tvShows] = [
    await run("movie", oldMovies.map((m) => m.id)),
    await run("tv", oldTvShows.map((t) => t.id)),
  ];

  return {
    checked: movies.checked + tvShows.checked,
    failed: movies.failed + tvShows.failed,
    movies: { removed: movies.removed },
    tvShows: { removed: tvShows.removed },
  };
}

