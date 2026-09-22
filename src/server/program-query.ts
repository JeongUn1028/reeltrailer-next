import type { Prisma } from "@prisma/client";
import type { ProgramSortKey } from "@/app/types/types";

//* 대용량 목록(/browse, 장르 전체 등)을 DB에서 직접 조회하기 위한 where/orderBy 빌더.
//* 카탈로그 메모리 캐시(catalog.ts)와 같은 정렬 규칙을 SQL로 옮긴 것이다.

//* 평점순에서 투표 수가 너무 적은 항목이 상위를 차지하지 않도록 하는 최소 투표 수
export const RATING_MIN_VOTE_COUNT = 50;

export interface ProgramWhereOptions {
  providerId?: number;
  genreId?: number;
  sort?: ProgramSortKey;
}

//* Movie/TvShow 공통 where. 두 모델의 관계 필드 이름이 같아 하나의 객체로 양쪽에 쓸 수 있다.
export function buildWhere({ providerId, genreId, sort }: ProgramWhereOptions) {
  const where: Prisma.MovieWhereInput & Prisma.TvShowWhereInput = {};
  if (providerId) where.providers = { some: { providerId } };
  if (genreId) where.genres = { some: { genreId } };
  if (sort === "rating") where.voteCount = { gte: RATING_MIN_VOTE_COUNT };
  return where;
}

type DateField = "releaseDate" | "firstAirDate";

//* 정렬 규칙. 최신순은 날짜 없는 항목을 뒤로 보낸다.
export function buildOrderBy(sort: ProgramSortKey, dateField: DateField) {
  switch (sort) {
    case "latest":
      return [
        { [dateField]: { sort: "desc", nulls: "last" } },
        { popularity: "desc" },
      ] as const;
    case "rating":
      return [{ voteAverage: "desc" }, { voteCount: "desc" }] as const;
    case "popular":
    default:
      return [{ popularity: "desc" }] as const;
  }
}
