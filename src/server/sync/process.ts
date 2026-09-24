//* TMDB 항목을 DB에 저장하는 로직. Cron 라우트와 백필 스크립트가 공유한다.
import type { PrismaClient } from "@prisma/client";
import type { TMDBProvider } from "./helpers";
import { hasSupportedProvider, parseDate } from "./helpers";
import type { TmdbClient, TmdbKind, TMDBMovie, TMDBTVShow } from "./tmdb";
import { buildSearchText } from "@/server/search/normalize";

export interface ProcessDeps {
  prisma: PrismaClient;
  tmdb: TmdbClient;
}

//* 장르 목록 동기화 (영화/TV upsert 시 genre connect가 실패하지 않도록 먼저 실행)
export async function syncGenres({ prisma, tmdb }: ProcessDeps): Promise<number> {
  const genreMap = await tmdb.fetchGenres();
  await Promise.all(
    Array.from(genreMap.entries()).map(([id, name]) =>
      prisma.genre.upsert({ where: { id }, update: { name }, create: { id, name } }),
    ),
  );
  return genreMap.size;
}

//* WatchProvider 마스터를 upsert하고, 콘텐츠-제공자 관계를 현재 목록과 동일하게 맞춘다
//* (새 관계는 createMany, 더 이상 제공하지 않는 관계는 삭제)
export async function syncWatchProviders(
  prisma: PrismaClient,
  providers: TMDBProvider[],
  target: { kind: TmdbKind; id: number },
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

  if (target.kind === "movie") {
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

export type ProcessOutcome = "saved" | "skipped";

//* 영화 한 편 처리: 제공자 확인 → upsert → 제공자 관계 저장. 국내 OTT 제공자가 없으면 저장하지 않는다.
export async function processMovie(
  { prisma, tmdb }: ProcessDeps,
  movie: TMDBMovie,
): Promise<ProcessOutcome> {
  const providers = await tmdb.fetchKrFlatrateProviders("movie", movie.id);
  if (!hasSupportedProvider(providers)) return "skipped";

  const [trailerKey, englishTitle] = await Promise.all([
    tmdb.fetchTrailerKey("movie", movie.id),
    tmdb.fetchEnglishTitle("movie", movie.id),
  ]);
  const data = {
    title: movie.title,
    originalTitle: movie.original_title,
    englishTitle,
    searchText: buildSearchText({ title: movie.title, originalTitle: movie.original_title, englishTitle }),
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    trailerKey,
    releaseDate: parseDate(movie.release_date),
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
  };
  const genreCreate = (movie.genre_ids ?? []).map((genreId) => ({ genre: { connect: { id: genreId } } }));

  await prisma.movie.upsert({
    where: { id: movie.id },
    update: { ...data, genres: { deleteMany: {}, create: genreCreate } },
    create: { id: movie.id, ...data, genres: { create: genreCreate } },
  });

  await syncWatchProviders(prisma, providers, { kind: "movie", id: movie.id });
  return "saved";
}

//* TV 프로그램 한 편 처리
export async function processTvShow(
  { prisma, tmdb }: ProcessDeps,
  tvShow: TMDBTVShow,
): Promise<ProcessOutcome> {
  const providers = await tmdb.fetchKrFlatrateProviders("tv", tvShow.id);
  if (!hasSupportedProvider(providers)) return "skipped";

  const [trailerKey, englishTitle] = await Promise.all([
    tmdb.fetchTrailerKey("tv", tvShow.id),
    tmdb.fetchEnglishTitle("tv", tvShow.id),
  ]);
  const data = {
    title: tvShow.name,
    originalTitle: tvShow.original_name,
    englishTitle,
    searchText: buildSearchText({ title: tvShow.name, originalTitle: tvShow.original_name, englishTitle }),
    overview: tvShow.overview,
    posterPath: tvShow.poster_path,
    backdropPath: tvShow.backdrop_path,
    trailerKey,
    firstAirDate: parseDate(tvShow.first_air_date),
    voteAverage: tvShow.vote_average,
    voteCount: tvShow.vote_count,
    popularity: tvShow.popularity,
  };
  const genreCreate = (tvShow.genre_ids ?? []).map((genreId) => ({ genre: { connect: { id: genreId } } }));

  await prisma.tvShow.upsert({
    where: { id: tvShow.id },
    update: { ...data, genres: { deleteMany: {}, create: genreCreate } },
    create: { id: tvShow.id, ...data, genres: { create: genreCreate } },
  });

  await syncWatchProviders(prisma, providers, { kind: "tv", id: tvShow.id });
  return "saved";
}
