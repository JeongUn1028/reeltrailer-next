import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrograms } from "@/server/contents";
import Program from "@/app/components/programs/program";
import FilterBar, { KIND_LABELS, SORT_LABELS } from "@/app/components/programs/filter-bar";
import { browseHref, genreLabel, isOttSlug, ottSlugToProviderId } from "@/app/lib/programUrls";
import { parseListSearchParams, type ListSearchParams } from "@/app/lib/listParams";
import styles from "./page.module.css";

const PAGE_SIZE = 24;

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

//* 더 보기 목록 페이지. ?ott=&kind=&genre=&sort=&page= 조합으로 동작
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
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages && total > 0) {
    notFound();
  }

  const base = { ott, kind, genre: genreId, sort };
  const title = buildTitle({ kind, genreId, ott });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>BROWSE</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.summary}>
            {SORT_LABELS[sort]} · 총 {total}편
            {totalPages > 1 && ` · ${page} / ${totalPages} 페이지`}
          </p>
        </div>
      </div>

      <FilterBar
        kind={kind}
        sort={sort}
        buildHref={(next) => browseHref({ ...base, ...next, page: 1 })}
      />

      {items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((program, index) => (
            <Program
              key={`${program.mediaType}-${program.id}`}
              program={program}
              priority={index < 6}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>조건에 맞는 콘텐츠가 없습니다.</div>
      )}

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="페이지 이동">
          {page > 1 ? (
            <Link href={browseHref({ ...base, page: page - 1 })} className={styles.pageLink}>
              <span aria-hidden="true">&lt;-</span> 이전
            </Link>
          ) : (
            <span className={`${styles.pageLink} ${styles.disabled}`}>
              <span aria-hidden="true">&lt;-</span> 이전
            </span>
          )}
          <span className={styles.pageInfo}>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={browseHref({ ...base, page: page + 1 })} className={styles.pageLink}>
              다음 <span aria-hidden="true">-&gt;</span>
            </Link>
          ) : (
            <span className={`${styles.pageLink} ${styles.disabled}`}>
              다음 <span aria-hidden="true">-&gt;</span>
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
