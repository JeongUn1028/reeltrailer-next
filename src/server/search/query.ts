import { Prisma } from "@prisma/client";
import prisma from "@/server/prisma";
import type { ProgramKindFilter, ProgramSummary } from "@/app/types/types";
import { normalizeSearchText } from "./normalize";

//* 검색 쿼리. searchText(정규화된 제목들) 기준으로
//*  - 부분 일치(LIKE) 또는 trigram 단어 유사도(word_similarity ≥ FUZZY_THRESHOLD)로 후보를 찾고
//*  - 정확 > 접두 > 부분 > 유사 순의 관련도(rank)와 유사도(sim), 인기순으로 정렬한다.
//* 유형별로 페이지를 나눠 조회하고(kind=all이면 두 유형을 합침) 총 건수도 함께 돌려준다.

export type SearchSort = "relevance" | "popular" | "latest";

export interface SearchOptions {
  providerId?: number;
  kind?: ProgramKindFilter;
  page?: number;
  /** 유형별 페이지 크기 */
  limit?: number;
  sort?: SearchSort;
}

export interface SearchHit extends ProgramSummary {
  /** 관련도 등급 (4 정확, 3 접두, 2 부분, 1 유사) */
  rank: 1 | 2 | 3 | 4;
  /** trigram 단어 유사도 0~1 */
  similarity: number;
}

export interface SearchPage {
  items: SearchHit[];
  page: number;
  hasMore: boolean;
  /** kind별 전체 건수의 합 */
  total: number;
  /** 정확/접두/부분 일치가 하나도 없어 유사 결과만 보여주는 경우 */
  fuzzy: boolean;
}

type RawHit = { id: number; rank: number; sim: number; popularity: number; total: bigint };

//* 오타 허용 기준. word_similarity는 검색어가 제목의 일부와 얼마나 비슷한지를 0~1로 돌려준다
//* (예: "오징이" vs "오징어게임" = 0.5, "squidgme" vs "squidgame" = 0.67). 짧은 한글 검색어에서는
//* similarity()보다 훨씬 관대해서 오타 검색에 적합하다.
const FUZZY_THRESHOLD = 0.4;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

interface TableSpec {
  table: string;
  relation: string;
  relationKey: string;
  dateColumn: string;
}

const MOVIE: TableSpec = { table: "Movie", relation: "MoviesOnWatchProviders", relationKey: "movieId", dateColumn: "releaseDate" };
const TV: TableSpec = { table: "TvShow", relation: "TvShowsOnWatchProviders", relationKey: "tvShowId", dateColumn: "firstAirDate" };

//* 한 테이블에서 후보 id/rank/sim을 페이지 단위로 조회하고 총 건수를 센다
async function queryTable(
  spec: TableSpec,
  normalizedQuery: string,
  { providerId, page, limit, sort }: Required<Pick<SearchOptions, "page" | "limit" | "sort">> & { providerId?: number },
): Promise<{ hits: RawHit[]; total: number }> {
  const t = Prisma.raw(`"${spec.table}"`);
  const like = `%${escapeLike(normalizedQuery)}%`;
  const prefix = `${escapeLike(normalizedQuery)}%`;
  const providerFilter = providerId
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM ${Prisma.raw(`"${spec.relation}"`)} r WHERE r.${Prisma.raw(`"${spec.relationKey}"`)} = t.id AND r."providerId" = ${providerId})`
    : Prisma.empty;
  const where = Prisma.sql`(t."searchText" LIKE ${like} ESCAPE '\\' OR word_similarity(${normalizedQuery}, t."searchText") >= ${FUZZY_THRESHOLD}) ${providerFilter}`;
  const rankExpr = Prisma.sql`CASE
      WHEN split_part(t."searchText", '|', 1) = ${normalizedQuery} THEN 4
      WHEN split_part(t."searchText", '|', 1) LIKE ${prefix} ESCAPE '\\' THEN 3
      WHEN t."searchText" LIKE ${like} ESCAPE '\\' THEN 2
      ELSE 1 END`;
  const orderBy =
    sort === "popular"
      ? Prisma.sql`t."popularity" DESC`
      : sort === "latest"
        ? Prisma.sql`t.${Prisma.raw(`"${spec.dateColumn}"`)} DESC NULLS LAST, t."popularity" DESC`
        : Prisma.sql`rank DESC, sim DESC, t."popularity" DESC`;

  // 총 건수는 윈도우 함수로 같은 쿼리에서 받아 커넥션 사용을 줄인다 (풀 크기 5 환경 고려)
  const hits = await prisma.$queryRaw<RawHit[]>(Prisma.sql`
      SELECT t.id, ${rankExpr} AS rank, word_similarity(${normalizedQuery}, t."searchText") AS sim, t."popularity",
             COUNT(*) OVER () AS total
      FROM ${t} t
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`);
  return { hits, total: Number(hits[0]?.total ?? 0) };
}

const summarySelect = {
  id: true,
  title: true,
  posterPath: true,
  backdropPath: true,
  trailerKey: true,
  voteAverage: true,
  voteCount: true,
  popularity: true,
  providers: { select: { provider: true } },
  genres: { select: { genre: true } },
} as const;

//* id 목록으로 요약 정보를 조회해 원래 순서대로 SearchHit을 만든다
async function hydrate(kind: "movie" | "tvshow", hits: RawHit[]): Promise<SearchHit[]> {
  if (hits.length === 0) return [];
  const ids = hits.map((h) => h.id);
  const rows =
    kind === "movie"
      ? await prisma.movie.findMany({ where: { id: { in: ids } }, select: { ...summarySelect, releaseDate: true } })
      : await prisma.tvShow.findMany({ where: { id: { in: ids } }, select: { ...summarySelect, firstAirDate: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hits.flatMap((hit) => {
    const row = byId.get(hit.id);
    if (!row) return [];
    const releaseDate = "releaseDate" in row ? row.releaseDate : row.firstAirDate;
    return [
      {
        id: row.id,
        mediaType: kind,
        title: row.title,
        posterPath: row.posterPath,
        backdropPath: row.backdropPath,
        trailerKey: row.trailerKey,
        releaseDate,
        voteAverage: row.voteAverage,
        voteCount: row.voteCount,
        popularity: row.popularity,
        providers: row.providers.map(({ provider }) => ({
          id: provider.id,
          providerName: provider.providerName,
          logoPath: provider.logoPath,
          displayPriority: provider.displayPriority,
        })),
        genres: row.genres.map(({ genre }) => ({ id: genre.id, name: genre.name })),
        rank: hit.rank as SearchHit["rank"],
        similarity: hit.sim,
      },
    ];
  });
}

const toTime = (d: Date | string | null) => (d ? new Date(d).getTime() || 0 : 0);

//* 두 유형의 결과를 정렬 기준에 맞춰 합친다
function mergeHits(a: SearchHit[], b: SearchHit[], sort: SearchSort): SearchHit[] {
  const merged = [...a, ...b];
  if (sort === "popular") return merged.sort((x, y) => y.popularity - x.popularity);
  if (sort === "latest") return merged.sort((x, y) => toTime(y.releaseDate) - toTime(x.releaseDate) || y.popularity - x.popularity);
  return merged.sort((x, y) => y.rank - x.rank || y.similarity - x.similarity || y.popularity - x.popularity);
}

export async function searchPrograms(
  query: string,
  { providerId, kind = "all", page = 1, limit = 20, sort = "relevance" }: SearchOptions = {},
): Promise<SearchPage> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return { items: [], page, hasMore: false, total: 0, fuzzy: false };

  const opts = { providerId, page, limit, sort };
  const [movies, tvShows] = await Promise.all([
    kind === "tvshow" ? Promise.resolve({ hits: [], total: 0 }) : queryTable(MOVIE, normalized, opts),
    kind === "movie" ? Promise.resolve({ hits: [], total: 0 }) : queryTable(TV, normalized, opts),
  ]);

  const hasMore = movies.hits.length > limit || tvShows.hits.length > limit;
  const [movieItems, tvItems] = await Promise.all([
    hydrate("movie", movies.hits.slice(0, limit)),
    hydrate("tvshow", tvShows.hits.slice(0, limit)),
  ]);
  const items = mergeHits(movieItems, tvItems, sort);
  const fuzzy = items.length > 0 && items.every((item) => item.rank === 1);

  return { items, page, hasMore, total: movies.total + tvShows.total, fuzzy };
}
