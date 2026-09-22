import type {
  GenreDetails,
  ProgramKindFilter,
  ProgramSortKey,
  ProgramSummary,
} from "@/app/types/types";

//* 카탈로그(메모리에 올라온 전체 콘텐츠)를 필터/정렬/페이지네이션하는 순수 함수 모음.
//* DB나 Next 런타임에 의존하지 않아 단위 테스트가 쉽다.

export interface Catalog {
  movies: ProgramSummary[];
  tvShows: ProgramSummary[];
}

// -------------------------
// 메모리 필터/정렬 유틸 (순수 함수)
// -------------------------

const toTime = (date: Date | string | null) => {
  if (!date) return Number.NEGATIVE_INFINITY;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

//* 평점순에서 투표 수가 너무 적은 항목(예: 1표에 10점)이 상위를 차지하지 않도록 하는 최소 투표 수
const RATING_MIN_VOTE_COUNT = 50;

export function sortPrograms(
  programs: ProgramSummary[],
  sort: ProgramSortKey,
): ProgramSummary[] {
  const sorted = [...programs];
  switch (sort) {
    case "latest":
      return sorted.sort(
        (a, b) =>
          toTime(b.releaseDate) - toTime(a.releaseDate) ||
          b.popularity - a.popularity,
      );
    case "rating":
      return sorted.sort((a, b) => {
        const aQualified = a.voteCount >= RATING_MIN_VOTE_COUNT ? 1 : 0;
        const bQualified = b.voteCount >= RATING_MIN_VOTE_COUNT ? 1 : 0;
        return (
          bQualified - aQualified ||
          b.voteAverage - a.voteAverage ||
          b.voteCount - a.voteCount
        );
      });
    case "popular":
    default:
      return sorted.sort((a, b) => b.popularity - a.popularity);
  }
}

export interface ProgramQuery {
  providerId?: number;
  kind?: ProgramKindFilter;
  genreId?: number;
  sort?: ProgramSortKey;
  limit?: number;
  page?: number;
}

//* 카탈로그에서 조건에 맞는 프로그램을 골라 정렬·페이지네이션한다.
export function queryCatalog(
  catalog: Catalog,
  {
    providerId,
    kind = "all",
    genreId,
    sort = "popular",
    limit = 20,
    page = 1,
  }: ProgramQuery,
): { items: ProgramSummary[]; total: number } {
  let pool: ProgramSummary[] =
    kind === "movie"
      ? catalog.movies
      : kind === "tvshow"
        ? catalog.tvShows
        : [...catalog.movies, ...catalog.tvShows];

  if (providerId) {
    pool = pool.filter((p) => p.providers.some((pr) => pr.id === providerId));
  }
  if (genreId) {
    pool = pool.filter((p) => p.genres.some((g) => g.id === genreId));
  }

  const sorted = sortPrograms(pool, sort);
  const start = Math.max(0, (page - 1) * limit);
  return { items: sorted.slice(start, start + limit), total: sorted.length };
}

//* 카탈로그에서 실제 데이터가 있는 장르만 (콘텐츠 수 내림차순) 반환
export function getAvailableGenres(
  catalog: Catalog,
  providerId?: number,
): (GenreDetails & { count: number })[] {
  const { items } = queryCatalog(catalog, {
    providerId,
    limit: Number.MAX_SAFE_INTEGER,
  });
  const counts = new Map<number, GenreDetails & { count: number }>();
  for (const program of items) {
    for (const genre of program.genres) {
      const entry = counts.get(genre.id);
      if (entry) entry.count += 1;
      else counts.set(genre.id, { ...genre, count: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

//* 최근 N일 내 공개된 콘텐츠 (신작 섹션용)
export function getRecentReleases(
  catalog: Catalog,
  {
    providerId,
    days = 30,
    limit = 20,
    now = new Date(),
  }: { providerId?: number; days?: number; limit?: number; now?: Date },
): ProgramSummary[] {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  const { items } = queryCatalog(catalog, {
    providerId,
    sort: "latest",
    limit: Number.MAX_SAFE_INTEGER,
  });
  return items
    .filter((p) => {
      const time = toTime(p.releaseDate);
      return time >= since && time <= now.getTime();
    })
    .slice(0, limit);
}


//* 유형별로 limit+1개씩 조회한 두 페이지를 인기순으로 합친다 (검색 무한 스크롤용).
//* 어느 한쪽이라도 limit개를 초과해 받았으면 다음 페이지가 있다고 본다.
export function mergeTypedPages(
  movies: ProgramSummary[],
  tvShows: ProgramSummary[],
  limit: number,
): { items: ProgramSummary[]; hasMore: boolean } {
  const hasMore = movies.length > limit || tvShows.length > limit;
  const items = sortPrograms(
    [...movies.slice(0, limit), ...tvShows.slice(0, limit)],
    "popular",
  );
  return { items, hasMore };
}
