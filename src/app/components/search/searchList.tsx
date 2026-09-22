import Link from "next/link";
import { searchPrograms, type SearchSort } from "@/server/contents";
import { ottSlugToProviderId } from "@/app/lib/programUrls";
import { SEARCH_PAGE_SIZE } from "@/app/lib/pageSizes";
import { isProgramKindFilter, type ProgramKindFilter } from "@/app/types/types";
import InfiniteProgramGrid from "@/app/components/programs/infinite-program-grid";
import SearchSummary from "./search-summary";
import styles from "./searchList.module.css";

const TYPE_LABELS: Record<ProgramKindFilter, string> = {
  all: "전체",
  movie: "영화",
  tvshow: "TV 프로그램",
};

const SORT_LABELS: Record<SearchSort, string> = {
  relevance: "관련도순",
  popular: "인기순",
  latest: "최신순",
};

const isSearchSort = (v: string | undefined): v is SearchSort => v === "relevance" || v === "popular" || v === "latest";

export default async function SearchResults({
  searchParams,
  params,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
  params?: Promise<{ ott?: string }>;
}) {
  const { q, type, sort } = await searchParams;
  const { ott } = params ? await params : { ott: undefined };
  const query = q?.trim();
  const activeType: ProgramKindFilter = isProgramKindFilter(type) ? type : "all";
  const activeSort: SearchSort = isSearchSort(sort) ? sort : "relevance";

  if (!query) {
    return (
      <main className={styles.page}>
        <section className={styles.container} aria-labelledby="search-results-title">
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>SEARCH RESULTS</p>
              <h1 id="search-results-title">검색어를 입력해주세요</h1>
            </div>
          </div>
          <div className={styles.empty}>검색할 콘텐츠 제목을 입력해 주세요.</div>
        </section>
      </main>
    );
  }

  const providerId = ottSlugToProviderId(ott);
  const firstPage = await searchPrograms(query, {
    providerId,
    kind: activeType,
    sort: activeSort,
    page: 1,
    limit: SEARCH_PAGE_SIZE,
  });

  const basePath = ott ? `/${ott}/search` : "/search";
  const buildHref = (next: { type?: ProgramKindFilter; sort?: SearchSort }) => {
    const sp = new URLSearchParams({ q: query });
    const nextType = next.type ?? activeType;
    const nextSort = next.sort ?? activeSort;
    if (nextType !== "all") sp.set("type", nextType);
    if (nextSort !== "relevance") sp.set("sort", nextSort);
    return `${basePath}?${sp.toString()}`;
  };

  // 무한 스크롤 API 엔드포인트 (page는 클라이언트가 붙인다)
  const apiParams = new URLSearchParams({ q: query, limit: String(SEARCH_PAGE_SIZE) });
  if (activeType !== "all") apiParams.set("kind", activeType);
  if (activeSort !== "relevance") apiParams.set("sort", activeSort);
  if (providerId) apiParams.set("providerId", String(providerId));
  const endpoint = `/api/search?${apiParams.toString()}`;

  return (
    <main className={styles.page}>
      <section className={styles.container} aria-labelledby="search-results-title">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>SEARCH RESULTS</p>
            <h1 id="search-results-title">
              <>&ldquo;{query}&rdquo; 검색 결과</>
            </h1>
          </div>
          <SearchSummary query={query} total={firstPage.total} fuzzy={firstPage.fuzzy} />
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="결과 유형">
            {(Object.keys(TYPE_LABELS) as ProgramKindFilter[]).map((key) => (
              <Link
                key={key}
                href={buildHref({ type: key })}
                role="tab"
                aria-selected={activeType === key}
                className={`${styles.tab} ${activeType === key ? styles.tabActive : ""}`}
                scroll={false}
              >
                {TYPE_LABELS[key]}
              </Link>
            ))}
          </div>
          <div className={styles.sorts} role="group" aria-label="정렬">
            {(Object.keys(SORT_LABELS) as SearchSort[]).map((key) => (
              <Link
                key={key}
                href={buildHref({ sort: key })}
                className={`${styles.sort} ${activeSort === key ? styles.sortActive : ""}`}
                aria-current={activeSort === key ? "true" : undefined}
                scroll={false}
              >
                {SORT_LABELS[key]}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.results}>
          <InfiniteProgramGrid
            key={endpoint}
            endpoint={endpoint}
            initialPage={firstPage}
            emptyText={
              ott
                ? "이 OTT에서는 결과가 없습니다. 상단 탭에서 All을 선택하면 전체 OTT에서 검색합니다."
                : "검색 결과가 없습니다. 띄어쓰기나 철자를 바꿔 다시 검색해 보세요."
            }
          />
        </div>
      </section>
    </main>
  );
}
