import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/server/prisma";
import type {
  GenreDetails,
  ProgramDetail,
  ProgramKindFilter,
  ProgramMediaType,
  ProgramSummary,
  Provider,
  SearchSuggestion,
} from "@/app/types/types";
import {
  mergeTypedPages,
  queryCatalog,
  type Catalog,
  type ProgramQuery,
} from "@/server/catalog";

export {
  getAvailableGenres,
  getRecentReleases,
  mergeTypedPages,
  queryCatalog,
  sortPrograms,
  type Catalog,
  type ProgramQuery,
} from "@/server/catalog";

//* 영화와 TV 프로그램의 정보를 가져오는 서버 측 함수들을 정의하는 파일
//*
//* 데이터는 하루 한 번 Cron에서만 바뀌므로, 카탈로그 전체를 한 번에 조회해
//* Next Data Cache(unstable_cache)에 CONTENTS_TAG 태그로 캐싱하고
//* 필터/정렬/페이지네이션은 메모리에서 처리한다. Cron 종료 시 revalidateTag로 무효화.

export const CONTENTS_TAG = "contents";
const CATALOG_REVALIDATE_SECONDS = 60 * 60; // 1시간 (Cron이 태그 무효화를 못 했을 때의 안전장치)
const CATALOG_MAX_ITEMS = 500; // 유형별 최대 조회 개수 (Cron 목표 300개보다 여유 있게)

// -------------------------
// Prisma select 정의
// -------------------------

const relationSelect = {
  providers: { select: { provider: true } },
  genres: { select: { genre: true } },
} as const;

const movieSummarySelect = {
  id: true,
  title: true,
  posterPath: true,
  backdropPath: true,
  trailerKey: true,
  releaseDate: true,
  voteAverage: true,
  voteCount: true,
  popularity: true,
  ...relationSelect,
} as const;

const tvShowSummarySelect = {
  id: true,
  title: true,
  posterPath: true,
  backdropPath: true,
  trailerKey: true,
  firstAirDate: true,
  voteAverage: true,
  voteCount: true,
  popularity: true,
  ...relationSelect,
} as const;

type RelationRow = {
  providers: { provider: Provider & { createdAt?: Date; updatedAt?: Date } }[];
  genres: { genre: GenreDetails }[];
};

const flattenProviders = (row: RelationRow): Provider[] =>
  row.providers.map(({ provider }) => ({
    id: provider.id,
    providerName: provider.providerName,
    logoPath: provider.logoPath,
    displayPriority: provider.displayPriority,
  }));

const flattenGenres = (row: RelationRow): GenreDetails[] =>
  row.genres.map(({ genre }) => ({ id: genre.id, name: genre.name }));

type MovieSummaryRow = RelationRow & {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey: string | null;
  releaseDate: Date | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
};

type TvShowSummaryRow = Omit<MovieSummaryRow, "releaseDate"> & {
  firstAirDate: Date | null;
};

const toMovieSummary = (row: MovieSummaryRow): ProgramSummary => ({
  id: row.id,
  mediaType: "movie",
  title: row.title,
  posterPath: row.posterPath,
  backdropPath: row.backdropPath,
  trailerKey: row.trailerKey,
  releaseDate: row.releaseDate,
  voteAverage: row.voteAverage,
  voteCount: row.voteCount,
  popularity: row.popularity,
  providers: flattenProviders(row),
  genres: flattenGenres(row),
});

const toTvShowSummary = (row: TvShowSummaryRow): ProgramSummary => ({
  id: row.id,
  mediaType: "tvshow",
  title: row.title,
  posterPath: row.posterPath,
  backdropPath: row.backdropPath,
  trailerKey: row.trailerKey,
  releaseDate: row.firstAirDate,
  voteAverage: row.voteAverage,
  voteCount: row.voteCount,
  popularity: row.popularity,
  providers: flattenProviders(row),
  genres: flattenGenres(row),
});

// -------------------------
// 카탈로그 (캐시됨)
// -------------------------


//* 전체 카탈로그 조회. 쿼리 2개로 끝나며 결과는 Data Cache에 저장된다.
export const getCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    const [movies, tvShows] = await Promise.all([
      prisma.movie.findMany({
        select: movieSummarySelect,
        orderBy: { popularity: "desc" },
        take: CATALOG_MAX_ITEMS,
      }),
      prisma.tvShow.findMany({
        select: tvShowSummarySelect,
        orderBy: { popularity: "desc" },
        take: CATALOG_MAX_ITEMS,
      }),
    ]);

    return {
      movies: movies.map(toMovieSummary),
      tvShows: tvShows.map(toTvShowSummary),
    };
  },
  ["catalog"],
  { tags: [CONTENTS_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// -------------------------
// 편의 함수 (컴포넌트/API에서 사용)
// -------------------------

//* 조건에 맞는 프로그램 목록 (카탈로그 캐시 사용)
export async function getPrograms(query: ProgramQuery) {
  const catalog = await getCatalog();
  return queryCatalog(catalog, query);
}

//* 특정 유형의 목록 (기존 API 호환용)
export async function getProgramList(
  providerId: number | undefined,
  kind: ProgramMediaType,
  limit = 20,
  page = 1,
): Promise<ProgramSummary[]> {
  const { items } = await getPrograms({ providerId, kind, limit, page });
  return items;
}

// -------------------------
// 상세 조회
// -------------------------

const detailInclude = {
  providers: { include: { provider: true } },
  genres: { include: { genre: true } },
} as const;

const fetchProgramDetail = unstable_cache(
  async (
    id: number,
    kind: ProgramMediaType,
  ): Promise<ProgramDetail | null> => {
    if (kind === "movie") {
      const movie = await prisma.movie.findUnique({
        where: { id },
        include: detailInclude,
      });
      if (!movie) return null;
      return {
        ...toMovieSummary(movie),
        originalTitle: movie.originalTitle,
        overview: movie.overview,
      };
    }

    const tvShow = await prisma.tvShow.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!tvShow) return null;
    return {
      ...toTvShowSummary(tvShow),
      originalTitle: tvShow.originalTitle,
      overview: tvShow.overview,
    };
  },
  ["program-detail"],
  { tags: [CONTENTS_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

//* 특정 프로그램 상세 조회. React.cache로 같은 요청 안(generateMetadata + 페이지)에서는 1회만 실행
export const getProgramById = cache(
  (id: number, kind: ProgramMediaType): Promise<ProgramDetail | null> =>
    fetchProgramDetail(id, kind),
);

//* 같은 장르를 공유하는 비슷한 콘텐츠 (상세 화면 하단용)
export async function getSimilarPrograms(
  program: Pick<ProgramSummary, "id" | "mediaType" | "genres">,
  limit = 12,
): Promise<ProgramSummary[]> {
  const catalog = await getCatalog();
  const genreIds = new Set(program.genres.map((g) => g.id));
  if (genreIds.size === 0) return [];

  const pool =
    program.mediaType === "movie" ? catalog.movies : catalog.tvShows;

  return pool
    .filter((p) => p.id !== program.id)
    .map((p) => ({
      program: p,
      overlap: p.genres.filter((g) => genreIds.has(g.id)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap || b.program.popularity - a.program.popularity,
    )
    .slice(0, limit)
    .map(({ program }) => program);
}

// -------------------------
// 검색
// -------------------------

const buildTitleWhere = (query: string) => ({
  OR: [
    { title: { contains: query, mode: "insensitive" as const } },
    { originalTitle: { contains: query, mode: "insensitive" as const } },
  ],
});

export interface SearchOptions {
  providerId?: number;
  kind?: ProgramKindFilter;
  page?: number;
  /** 유형별 페이지 크기 */
  limit?: number;
}

export interface SearchPage {
  items: ProgramSummary[];
  page: number;
  hasMore: boolean;
}

//* 제목/원제 검색. 영화·TV를 병렬 조회해 인기순으로 합치고 페이지 단위로 반환한다.
//* kind=all이면 유형별로 limit개씩 가져오므로 한 페이지에 최대 2*limit개가 올 수 있다.
export async function searchPrograms(
  query: string,
  { providerId, kind = "all", page = 1, limit = 20 }: SearchOptions = {},
): Promise<SearchPage> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], page, hasMore: false };

  const providerWhere = providerId
    ? { providers: { some: { providerId } } }
    : {};
  const pagination = { skip: (page - 1) * limit, take: limit + 1 };

  const [movies, tvShows] = await Promise.all([
    kind === "tvshow"
      ? Promise.resolve([])
      : prisma.movie.findMany({
          where: { ...buildTitleWhere(trimmed), ...providerWhere },
          select: movieSummarySelect,
          orderBy: { popularity: "desc" },
          ...pagination,
        }),
    kind === "movie"
      ? Promise.resolve([])
      : prisma.tvShow.findMany({
          where: { ...buildTitleWhere(trimmed), ...providerWhere },
          select: tvShowSummarySelect,
          orderBy: { popularity: "desc" },
          ...pagination,
        }),
  ]);

  const merged = mergeTypedPages(
    movies.map(toMovieSummary),
    tvShows.map(toTvShowSummary),
    limit,
  );
  return { ...merged, page };
}

//* 검색 자동완성용 경량 조회
export async function searchSuggestions(
  query: string,
  providerId?: number,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const { items } = await searchPrograms(query, { providerId, limit });
  return items.slice(0, limit).map((p) => ({
    id: p.id,
    mediaType: p.mediaType,
    title: p.title,
    posterPath: p.posterPath,
    releaseDate: p.releaseDate,
  }));
}
