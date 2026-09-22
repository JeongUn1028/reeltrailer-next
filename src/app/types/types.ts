export interface Provider {
  id: number;
  providerName: string;
  logoPath: string | null;
  displayPriority?: number;
}

export interface GenreDetails {
  id: number;
  name: string;
}

export type ProgramMediaType = "movie" | "tvshow";

//* 목록/카드에 필요한 최소 정보. Movie의 releaseDate와 TvShow의 firstAirDate는 releaseDate로 통일
export interface ProgramSummary {
  id: number;
  mediaType: ProgramMediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey: string | null;
  releaseDate: Date | string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  providers: Provider[];
  genres: GenreDetails[];
}

//* 상세 화면용 정보
export interface ProgramDetail extends ProgramSummary {
  originalTitle: string | null;
  overview: string | null;
}

//* 검색 자동완성 응답 항목
export interface SearchSuggestion {
  id: number;
  mediaType: ProgramMediaType;
  title: string;
  posterPath: string | null;
  releaseDate: Date | string | null;
}

export type ProgramSortKey = "popular" | "latest" | "rating";
export type ProgramKindFilter = "all" | ProgramMediaType;

export const PROGRAM_SORT_KEYS: ProgramSortKey[] = ["popular", "latest", "rating"];
export const PROGRAM_KIND_FILTERS: ProgramKindFilter[] = ["all", "movie", "tvshow"];

export function isProgramSortKey(value: unknown): value is ProgramSortKey {
  return PROGRAM_SORT_KEYS.includes(value as ProgramSortKey);
}

export function isProgramKindFilter(value: unknown): value is ProgramKindFilter {
  return PROGRAM_KIND_FILTERS.includes(value as ProgramKindFilter);
}
