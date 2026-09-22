import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { ProgramKindFilter, ProgramSortKey } from "@/app/types/types";
import {
  getAvailableGenres,
  getCatalog,
  getRecentReleases,
  queryCatalog,
} from "@/server/contents";
import { browseHref, genreLabel } from "@/app/lib/programUrls";
import ProgramRow from "./program-row";
import FilterBar, { SORT_LABELS } from "./filter-bar";
import ProgramsSkeleton from "../skeleton/programs-skeleton";
import RecommendErrorFallback from "./recommend-error-fallback";

const ROW_LIMIT = 20;
const GENRE_ROW_COUNT = 10;
const RECENT_DAYS = 45;

type RecommendSectionProps = {
  ott?: string;
  providerId?: number;
  kind?: ProgramKindFilter;
  sort?: ProgramSortKey;
};

//* 홈/OTT 페이지의 추천 영역. 카탈로그를 한 번만 조회해 모든 행을 메모리에서 구성한다.
export default function RecommendSection(props: RecommendSectionProps) {
  return (
    <ErrorBoundary FallbackComponent={RecommendErrorFallback}>
      <Suspense fallback={<ProgramsSkeleton />}>
        <RecommendRows {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

async function RecommendRows({
  ott,
  providerId,
  kind = "all",
  sort = "popular",
}: RecommendSectionProps) {
  const catalog = await getCatalog();
  const base = { ott, kind, sort };
  const sortSuffix = sort === "popular" ? "" : ` · ${SORT_LABELS[sort]}`;

  const recent = getRecentReleases(catalog, {
    providerId,
    days: RECENT_DAYS,
    limit: ROW_LIMIT,
  }).filter((p) => kind === "all" || p.mediaType === kind);

  const movies =
    kind !== "tvshow"
      ? queryCatalog(catalog, { providerId, kind: "movie", sort, limit: ROW_LIMIT }).items
      : [];
  const tvShows =
    kind !== "movie"
      ? queryCatalog(catalog, { providerId, kind: "tvshow", sort, limit: ROW_LIMIT }).items
      : [];

  const genreRows = getAvailableGenres(catalog, providerId)
    .map((genre) => ({
      genre,
      items: queryCatalog(catalog, {
        providerId,
        kind,
        genreId: genre.id,
        sort,
        limit: ROW_LIMIT,
      }).items,
    }))
    .filter(({ items }) => items.length >= 4)
    .slice(0, GENRE_ROW_COUNT);

  return (
    <>
      <FilterBar
        kind={kind}
        sort={sort}
        buildHref={(next) => {
          const params = new URLSearchParams();
          const nextKind = next.kind ?? kind;
          const nextSort = next.sort ?? sort;
          if (nextKind !== "all") params.set("kind", nextKind);
          if (nextSort !== "popular") params.set("sort", nextSort);
          const query = params.toString();
          const path = ott ? `/${ott}` : "/";
          return query ? `${path}?${query}` : path;
        }}
      />

      <ProgramRow
        title="최근 공개된 신작"
        programs={recent}
        moreHref={browseHref({ ...base, sort: "latest" })}
        priorityCount={4}
      />
      <ProgramRow
        title={`추천하는 영화${sortSuffix}`}
        programs={movies}
        moreHref={browseHref({ ...base, kind: "movie" })}
      />
      <ProgramRow
        title={`추천하는 TV 프로그램${sortSuffix}`}
        programs={tvShows}
        moreHref={browseHref({ ...base, kind: "tvshow" })}
      />
      {genreRows.map(({ genre, items }) => (
        <ProgramRow
          key={genre.id}
          title={`${genreLabel(genre.id, genre.name)} 장르${sortSuffix}`}
          programs={items}
          moreHref={browseHref({ ...base, genre: genre.id })}
        />
      ))}
    </>
  );
}
