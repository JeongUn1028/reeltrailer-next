import {
  isProgramKindFilter,
  isProgramSortKey,
  type ProgramKindFilter,
  type ProgramSortKey,
} from "@/app/types/types";

export type ListSearchParams = {
  kind?: string;
  sort?: string;
  page?: string;
  genre?: string;
  ott?: string;
};

//* 목록 관련 searchParams를 검증해 기본값과 함께 반환
export function parseListSearchParams(params: ListSearchParams): {
  kind: ProgramKindFilter;
  sort: ProgramSortKey;
  page: number;
  genreId?: number;
  ott?: string;
} {
  const kind = isProgramKindFilter(params.kind) ? params.kind : "all";
  const sort = isProgramSortKey(params.sort) ? params.sort : "popular";
  const pageNumber = Number(params.page);
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const genreNumber = Number(params.genre);
  const genreId =
    Number.isInteger(genreNumber) && genreNumber > 0 ? genreNumber : undefined;
  const ott = params.ott || undefined;

  return { kind, sort, page, genreId, ott };
}
