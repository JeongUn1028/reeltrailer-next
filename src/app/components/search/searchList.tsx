import Link from "next/link";
import { searchPrograms } from "@/server/contents";
import { ottSlugToProviderId } from "@/app/lib/programUrls";
import { isProgramKindFilter, type ProgramKindFilter } from "@/app/types/types";
import Program from "@/app/components/programs/program";
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
  const programs = await searchPrograms(query, providerId);
  const counts = {
    all: programs.length,
    movie: programs.filter((p) => p.mediaType === "movie").length,
    tvshow: programs.filter((p) => p.mediaType === "tvshow").length,
  };
  const visible =
    activeType === "all" ? programs : programs.filter((p) => p.mediaType === activeType);

  const basePath = ott ? `/${ott}/search` : "/search";
  const typeHref = (next: ProgramKindFilter) => {
    const sp = new URLSearchParams({ q: query });
    if (next !== "all") sp.set("type", next);
    return `${basePath}?${sp.toString()}`;
  };

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
          <span className={styles.count}>{visible.length}편</span>
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
              <span className={styles.tabCount}>{counts[key]}</span>
            </Link>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className={styles.list}>
            {visible.map((program) => (
              <Program key={`${program.mediaType}-${program.id}`} program={program} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>검색 결과가 없습니다.</div>
        )}
      </section>
    </main>
  );
}
