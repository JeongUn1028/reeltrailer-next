import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/server/prisma";
import type {
  GenreDetails,
  ProgramDetail,
  ProgramMediaType,
  ProgramSummary,
  Provider,
  SearchSuggestion,
} from "@/app/types/types";
import { sortPrograms, type Catalog, type ProgramQuery } from "@/server/catalog";
import { buildOrderBy, buildWhere } from "@/server/program-query";

export {
  buildRecommendRows,
  getAvailableGenres,
  getRecentReleases,
  mergeTypedPages,
  queryCatalog,
  selectTrailerPrograms,
  sortPrograms,
  type Catalog,
  type ProgramQuery,
  type RecommendRow,
} from "@/server/catalog";

//* 영화와 TV 프로그램의 정보를 가져오는 서버 측 함수들을 정의하는 파일
//*
//* - 홈 추천 행: 인기 상위 FEATURED_LIMIT건만 카탈로그로 조회해 Next Data Cache(unstable_cache,
//*   CONTENTS_TAG)에 캐싱하고 메모리에서 행을 구성한다 (catalog.ts). 전체 콘텐츠(수만 건)를
//*   캐시에 넣으면 항목당 2MB 제한을 넘기 때문에 상위만 담는다.
//* - /browse, 검색, 사이트맵 등 전체 목록: DB에서 페이지 단위로 직접 조회한다 (program-query.ts).
//* Cron 종료 시 revalidateTag로 캐시를 무효화한다.

export const CONTENTS_TAG = "contents";
const CATALOG_REVALIDATE_SECONDS = 60 * 60; // 1시간 (Cron이 태그 무효화를 못 했을 때의 안전장치)
//* 홈 추천용 카탈로그에 담을 유형별 인기 상위 개수. 장르 행(최대 10개 × 20건)과 OTT 필터를 채우기에 충분한 크기
const FEATURED_LIMIT = 1000;

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


//* 홈 추천용 카탈로그(유형별 인기 상위 FEATURED_LIMIT건). 쿼리 2개로 끝나며 결과는 Data Cache에 저장된다.
export const getCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    const [movies, tvShows] = await Promise.all([
      prisma.movie.findMany({
        select: movieSummarySelect,
        orderBy: { popularity: "desc" },
        take: FEATURED_LIMIT,
      }),
      prisma.tvShow.findMany({
        select: tvShowSummarySelect,
        orderBy: { popularity: "desc" },
        take: FEATURED_LIMIT,
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
// 전체 목록 조회 (DB 페이지 단위)
// -------------------------

export interface ProgramPageResult {
  items: ProgramSummary[];
  /** kind별 전체 개수의 합 */
  total: number;
  page: number;
  hasMore: boolean;
}

//* 조건에 맞는 프로그램을 DB에서 페이지 단위로 조회한다.
//* kind=all이면 영화/TV를 각각 limit개씩 가져와 정렬해 합치므로 한 페이지에 최대 2*limit개가 올 수 있다
//* (두 테이블을 하나의 정렬로 합치는 대신 유형별 페이지를 유지해 페이지네이션이 단순하고 일관되게 동작한다).
export async function getPrograms({
  providerId,
  kind = "all",
  genreId,
  sort = "popular",
  limit = 20,
  page = 1,
}: ProgramQuery): Promise<ProgramPageResult> {
  const where = buildWhere({ providerId, genreId, sort });
  const skip = Math.max(0, (page - 1) * limit);
  const wantMovies = kind !== "tvshow";
  const wantTvShows = kind !== "movie";

  const [movies, movieTotal, tvShows, tvTotal] = await Promise.all([
    wantMovies
      ? prisma.movie.findMany({
          where,
          select: movieSummarySelect,
          orderBy: [...buildOrderBy(sort, "releaseDate")],
          skip,
          take: limit + 1,
        })
      : Promise.resolve([]),
    wantMovies ? prisma.movie.count({ where }) : Promise.resolve(0),
    wantTvShows
      ? prisma.tvShow.findMany({
          where,
          select: tvShowSummarySelect,
          orderBy: [...buildOrderBy(sort, "firstAirDate")],
          skip,
          take: limit + 1,
        })
      : Promise.resolve([]),
    wantTvShows ? prisma.tvShow.count({ where }) : Promise.resolve(0),
  ]);

  const hasMore = movies.length > limit || tvShows.length > limit;
  const items = sortPrograms(
    [...movies.slice(0, limit).map(toMovieSummary), ...tvShows.slice(0, limit).map(toTvShowSummary)],
    sort,
  );

  return { items, total: movieTotal + tvTotal, page, hasMore };
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

//* 사이트맵용: 전체 콘텐츠의 id/유형/갱신일만 조회
export async function getAllProgramRefs(): Promise<
  { id: number; mediaType: ProgramMediaType; updatedAt: Date }[]
> {
  const [movies, tvShows] = await Promise.all([
    prisma.movie.findMany({ select: { id: true, updatedAt: true }, orderBy: { popularity: "desc" } }),
    prisma.tvShow.findMany({ select: { id: true, updatedAt: true }, orderBy: { popularity: "desc" } }),
  ]);
  return [
    ...movies.map((m) => ({ ...m, mediaType: "movie" as const })),
    ...tvShows.map((t) => ({ ...t, mediaType: "tvshow" as const })),
  ];
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
        englishTitle: movie.englishTitle,
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
      englishTitle: tvShow.englishTitle,
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

import { searchPrograms } from "@/server/search/query";

export { searchPrograms };
export type { SearchHit, SearchOptions, SearchPage, SearchSort } from "@/server/search/query";

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
    providers: p.providers,
  }));
}
