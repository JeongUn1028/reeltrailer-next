import providerIds from "@/config/ott-provider-ids.json";
import genres from "@/config/genre.json";
import type {
  ProgramKindFilter,
  ProgramMediaType,
  ProgramSortKey,
} from "@/app/types/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w342" | "w500" | "w780";
export type BackdropSize = "w780" | "w1280";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  if (!path) return null;
  return path.startsWith("http") ? path : `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = "w1280") {
  if (!path) return null;
  return path.startsWith("http") ? path : `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function programHref(id: number, mediaType: ProgramMediaType) {
  return `/program/${id}?kind=${mediaType}`;
}

export function releaseYear(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : year;
}

export type OttSlug = keyof typeof providerIds;

export function isOttSlug(value: string | undefined): value is OttSlug {
  return value !== undefined && value in providerIds;
}

export function ottSlugToProviderId(slug: string | undefined): number | undefined {
  return isOttSlug(slug) ? Number(providerIds[slug]) : undefined;
}

//* 장르 표시 이름 (config 우선, 없으면 DB 이름)
export function genreLabel(id: number, fallback?: string) {
  return genres.find((g) => g.id === id)?.name ?? fallback ?? "";
}

export interface BrowseParams {
  ott?: string;
  kind?: ProgramKindFilter;
  genre?: number;
  sort?: ProgramSortKey;
  page?: number;
}

//* 목록(더 보기) 페이지 URL 생성. 기본값과 같은 파라미터는 생략
export function browseHref({ ott, kind, genre, sort, page }: BrowseParams) {
  const params = new URLSearchParams();
  if (ott) params.set("ott", ott);
  if (kind && kind !== "all") params.set("kind", kind);
  if (genre) params.set("genre", String(genre));
  if (sort && sort !== "popular") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

//* OTT별 검색 페이지 딥링크 (제공자 페이지 내 검색)
const OTT_SEARCH_URLS: Record<string, (title: string) => string> = {
  netflix: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  "disney plus": (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  tving: (t) => `https://www.tving.com/search?keyword=${encodeURIComponent(t)}`,
  watcha: (t) => `https://watcha.com/search?query=${encodeURIComponent(t)}`,
  wavve: (t) => `https://www.wavve.com/search?searchWord=${encodeURIComponent(t)}`,
};

export function ottSearchUrl(providerName: string, title: string): string | null {
  const key = providerName.trim().toLowerCase().replace("+", " plus");
  const build = OTT_SEARCH_URLS[key];
  return build ? build(title) : null;
}
