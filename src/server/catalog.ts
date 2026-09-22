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

//* 예고편 쇼케이스용 목록: 예고편이 있는 항목만, 같은 예고편 키는 하나만, 조건/정렬을 반영해 limit개
export function selectTrailerPrograms(
  catalog: Catalog,
  { providerId, kind = "all", sort = "popular", limit = 20 }: Omit<ProgramQuery, "genreId" | "page">,
): ProgramSummary[] {
  const { items } = queryCatalog(catalog, { providerId, kind, sort, limit: Number.MAX_SAFE_INTEGER });
  const seen = new Set<string>();
  const result: ProgramSummary[] = [];
  for (const program of items) {
    if (!program.trailerKey || seen.has(program.trailerKey)) continue;
    seen.add(program.trailerKey);
    result.push(program);
    if (result.length >= limit) break;
  }
  return result;
}

// -------------------------
// 홈 추천 행 구성
// -------------------------

export interface RecommendRow {
  key: string;
  title: string;
  programs: ProgramSummary[];
  /** 장르 행이면 장르 ID */
  genreId?: number;
}

export interface BuildRecommendRowsOptions {
  providerId?: number;
  kind?: ProgramKindFilter;
  sort?: ProgramSortKey;
  /** 행당 카드 수 */
  rowLimit?: number;
  /** 장르 행 최대 개수 */
  genreRowCount?: number;
  /** 이 개수 미만인 장르 행은 숨김 */
  minGenreRowSize?: number;
  /** 신작 행 기간(일) */
  recentDays?: number;
  now?: Date;
  /** 장르 표시 이름 (없으면 카탈로그의 이름) */
  genreLabel?: (id: number, fallback: string) => string;
}

const programKey = (p: ProgramSummary) => `${p.mediaType}-${p.id}`;

//* 홈 추천 행을 한 번에 구성한다.
//* - 신작: 최근 N일 안에서 인기순, 포스터 없는 항목 제외
//* - 영화/TV: 조건·정렬 반영
//* - 장르: 앞 행에 이미 나온 작품은 제외해 행 간 중복을 줄인다
export function buildRecommendRows(
  catalog: Catalog,
  {
    providerId,
    kind = "all",
    sort = "popular",
    rowLimit = 16,
    genreRowCount = 10,
    minGenreRowSize = 4,
    recentDays = 45,
    now = new Date(),
    genreLabel = (_id, fallback) => fallback,
  }: BuildRecommendRowsOptions = {},
): RecommendRow[] {
  const rows: RecommendRow[] = [];
  const shown = new Set<string>();
  const remember = (programs: ProgramSummary[]) => {
    for (const p of programs) shown.add(programKey(p));
    return programs;
  };

  // 1) 신작: 기간 안의 항목을 인기순으로
  const recent = getRecentReleases(catalog, { providerId, days: recentDays, limit: Number.MAX_SAFE_INTEGER, now })
    .filter((p) => (kind === "all" || p.mediaType === kind) && p.posterPath);
  const recentRow = sortPrograms(recent, "popular").slice(0, rowLimit);
  if (recentRow.length > 0) {
    rows.push({ key: "recent", title: "최근 공개된 신작", programs: remember(recentRow) });
  }

  // 2) 영화 / TV
  if (kind !== "tvshow") {
    const movies = queryCatalog(catalog, { providerId, kind: "movie", sort, limit: rowLimit }).items;
    if (movies.length > 0) rows.push({ key: "movies", title: "추천하는 영화", programs: remember(movies) });
  }
  if (kind !== "movie") {
    const tvShows = queryCatalog(catalog, { providerId, kind: "tvshow", sort, limit: rowLimit }).items;
    if (tvShows.length > 0) rows.push({ key: "tvshows", title: "추천하는 TV 프로그램", programs: remember(tvShows) });
  }

  // 3) 장르: 데이터가 많은 장르부터, 이미 보여준 작품은 제외
  for (const genre of getAvailableGenres(catalog, providerId)) {
    if (rows.filter((r) => r.genreId !== undefined).length >= genreRowCount) break;
    const candidates = queryCatalog(catalog, {
      providerId,
      kind,
      genreId: genre.id,
      sort,
      limit: Number.MAX_SAFE_INTEGER,
    }).items.filter((p) => !shown.has(programKey(p)));
    const programs = candidates.slice(0, rowLimit);
    if (programs.length < minGenreRowSize) continue;
    rows.push({
      key: `genre-${genre.id}`,
      title: `${genreLabel(genre.id, genre.name)} 장르`,
      programs: remember(programs),
      genreId: genre.id,
    });
  }

  return rows;
}
