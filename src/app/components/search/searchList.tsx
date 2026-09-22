import Link from "next/link";
import { searchPrograms } from "@/server/contents";
import { SEARCH_PAGE_SIZE } from "@/app/lib/pageSizes";
import { ottSlugToProviderId } from "@/app/lib/programUrls";
import { isProgramKindFilter, type ProgramKindFilter } from "@/app/types/types";
import InfiniteProgramGrid from "@/app/components/programs/infinite-program-grid";
import styles from "./searchList.module.css";

const TYPE_LABELS: Record<ProgramKindFilter, string> = {
  all: "전체",
  movie: "영화",
  tvshow: "TV 프로그램",
};

export default async function SearchResults({
  searchParams,
  params,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
  params?: Promise<{ ott?: string }>;
}) {
  const { q, type } = await searchParams;
  const { ott } = params ? await params : { ott: undefined };
  const query = q?.trim();
  const activeType: ProgramKindFilter = isProgramKindFilter(type) ? type : "all";

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
    page: 1,
    limit: SEARCH_PAGE_SIZE,
  });

  const basePath = ott ? `/${ott}/search` : "/search";
  const typeHref = (next: ProgramKindFilter) => {
    const sp = new URLSearchParams({ q: query });
    if (next !== "all") sp.set("type", next);
    return `${basePath}?${sp.toString()}`;
  };

  // 무한 스크롤 API 엔드포인트 (page는 클라이언트가 붙인다)
  const apiParams = new URLSearchParams({ q: query, limit: String(SEARCH_PAGE_SIZE) });
  if (activeType !== "all") apiParams.set("kind", activeType);
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
          <span className={styles.count}>
            {firstPage.items.length}
            {firstPage.hasMore ? "+" : ""}편
          </span>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="결과 유형">
          {(Object.keys(TYPE_LABELS) as ProgramKindFilter[]).map((key) => (
            <Link
              key={key}
              href={typeHref(key)}
              role="tab"
              aria-selected={activeType === key}
              className={`${styles.tab} ${activeType === key ? styles.tabActive : ""}`}
              scroll={false}
            >
              {TYPE_LABELS[key]}
            </Link>
          ))}
        </div>

        <div className={styles.results}>
          <InfiniteProgramGrid
            key={endpoint}
            endpoint={endpoint}
            initialPage={firstPage}
            emptyText="검색 결과가 없습니다."
          />
        </div>
      </section>
    </main>
  );
}
