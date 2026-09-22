import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrograms } from "@/server/contents";
import FilterBar, { KIND_LABELS, SORT_LABELS } from "@/app/components/programs/filter-bar";
import InfiniteProgramGrid from "@/app/components/programs/infinite-program-grid";
import { browseHref, genreLabel, isOttSlug, ottSlugToProviderId } from "@/app/lib/programUrls";
import { parseListSearchParams, type ListSearchParams } from "@/app/lib/listParams";
import { BROWSE_PAGE_SIZE } from "@/app/lib/pageSizes";
import styles from "./page.module.css";

const OTT_LABELS: Record<string, string> = {
  netflix: "Netflix",
  "disney-plus": "Disney+",
  tving: "Tving",
  watcha: "Watcha",
  wavve: "Wavve",
};

function buildTitle({
  kind,
  genreId,
  ott,
}: {
  kind: "all" | "movie" | "tvshow";
  genreId?: number;
  ott?: string;
}) {
  const parts: string[] = [];
  if (ott) parts.push(OTT_LABELS[ott] ?? ott);
  if (genreId) parts.push(`${genreLabel(genreId)} 장르`);
  parts.push(kind === "all" ? "전체 콘텐츠" : `${KIND_LABELS[kind]} 전체`);
  return parts.join(" · ");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}): Promise<Metadata> {
  const parsed = parseListSearchParams(await searchParams);
  return {
    title: buildTitle(parsed),
    robots: { index: false },
  };
}

//* 더 보기 목록 페이지. ?ott=&kind=&genre=&sort=&page= 조합으로 동작.
//* 첫 페이지는 서버에서 렌더링하고, 이후는 /api/browse로 무한 스크롤.
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const { kind, sort, page, genreId, ott } = parseListSearchParams(await searchParams);

  if (ott && !isOttSlug(ott)) {
    notFound();
  }
  const providerId = ottSlugToProviderId(ott);

  const { items, total } = await getPrograms({
    providerId,
    kind,
    genreId,
    sort,
    page,
    limit: BROWSE_PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  if (page > totalPages && total > 0) {
    notFound();
  }

  const base = { ott, kind, genre: genreId, sort };
  const title = buildTitle({ kind, genreId, ott });

  // 무한 스크롤 API 엔드포인트: 페이지 쿼리와 동일한 파라미터 (page는 클라이언트가 붙인다)
  const apiParams = new URLSearchParams();
  if (ott) apiParams.set("ott", ott);
  if (kind !== "all") apiParams.set("kind", kind);
  if (genreId) apiParams.set("genre", String(genreId));
  if (sort !== "popular") apiParams.set("sort", sort);
  apiParams.set("limit", String(BROWSE_PAGE_SIZE));
  const endpoint = `/api/browse?${apiParams.toString()}`;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>BROWSE</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.summary}>
            {SORT_LABELS[sort]} · 총 {total}편
            {page > 1 && ` · ${page}페이지부터`}
          </p>
        </div>
      </div>

      <FilterBar
        kind={kind}
        sort={sort}
        buildHref={(next) => browseHref({ ...base, ...next, page: 1 })}
      />

      <InfiniteProgramGrid
        key={`${endpoint}#${page}`}
        endpoint={endpoint}
        initialPage={{ items, page, hasMore: page * BROWSE_PAGE_SIZE < total }}
      />

      {/* JS가 없는 환경(크롤러 등)을 위한 페이지 링크 */}
      {totalPages > 1 && (
        <noscript>
          <nav className={styles.pagination} aria-label="페이지 이동">
            {page > 1 && (
              <Link href={browseHref({ ...base, page: page - 1 })} className={styles.pageLink}>
                이전
              </Link>
            )}
            <span className={styles.pageInfo}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={browseHref({ ...base, page: page + 1 })} className={styles.pageLink}>
                다음
              </Link>
            )}
          </nav>
        </noscript>
      )}
    </main>
  );
}
