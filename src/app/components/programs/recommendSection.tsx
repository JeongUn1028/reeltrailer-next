import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { ProgramKindFilter, ProgramSortKey } from "@/app/types/types";
import { buildRecommendRows, getCatalog } from "@/server/contents";
import { browseHref, genreLabel } from "@/app/lib/programUrls";
import ProgramRow from "./program-row";
import RevealRow from "./reveal-row";
import FilterBar from "./filter-bar";
import ProgramsSkeleton from "../skeleton/programs-skeleton";
import RecommendErrorFallback from "./recommend-error-fallback";

//* 행당 카드 수. 20 → 16으로 줄여 페이지 길이와 중복 노출을 낮춘다 (나머지는 "더 보기")
const ROW_LIMIT = 16;
const GENRE_ROW_COUNT = 10;
const RECENT_DAYS = 45;
//* 첫 화면에 보이는 행 수. 이 개수는 등장 애니메이션 없이 바로 표시하고 나머지는 스크롤로 들어올 때 등장
const EAGER_ROW_COUNT = 2;

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

async function RecommendRows({ ott, providerId, kind = "all", sort = "popular" }: RecommendSectionProps) {
  const catalog = await getCatalog();
  const base = { ott, kind, sort };

  const rows = buildRecommendRows(catalog, {
    providerId,
    kind,
    sort,
    rowLimit: ROW_LIMIT,
    genreRowCount: GENRE_ROW_COUNT,
    recentDays: RECENT_DAYS,
    genreLabel,
  });

  const moreHrefFor = (row: (typeof rows)[number]) => {
    if (row.key === "recent") return browseHref({ ...base, sort: "latest" });
    if (row.key === "movies") return browseHref({ ...base, kind: "movie" });
    if (row.key === "tvshows") return browseHref({ ...base, kind: "tvshow" });
    return browseHref({ ...base, genre: row.genreId });
  };

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

      {rows.map((row, index) => (
        <RevealRow key={row.key} eager={index < EAGER_ROW_COUNT}>
          <ProgramRow
            title={row.title}
            programs={row.programs}
            moreHref={moreHrefFor(row)}
            priorityCount={index === 0 ? 4 : 0}
          />
        </RevealRow>
      ))}
    </>
  );
}
