import { searchPrograms } from "@/server/contents";
import type { ProgramType } from "@/app/types/types";
import Program from "@/app/components/programs/program";
import styles from "./searchList.module.css";

export default async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return (
      <main className={styles.page}>
        <section
          className={styles.container}
          aria-labelledby="search-results-title"
        >
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>SEARCH RESULTS</p>
              <h1 id="search-results-title">검색어를 입력해주세요</h1>
            </div>
          </div>
          <div className={styles.empty}>
            검색할 콘텐츠 제목을 입력해 주세요.
          </div>
        </section>
      </main>
    );
  }

  const programs: ProgramType[] = await searchPrograms(query);
  return (
    <main className={styles.page}>
      <section
        className={styles.container}
        aria-labelledby="search-results-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>SEARCH RESULTS</p>
            <h1 id="search-results-title">
              <>&ldquo;{query}&rdquo; 검색 결과</>
            </h1>
          </div>
          <span className={styles.count}>{programs.length}편</span>
        </div>

        {programs.length > 0 ? (
          <div className={styles.list}>
            {programs.map((program) => (
              <Program
                key={`${program.mediaType}-${program.id}`}
                props={program}
                title={program.mediaType === "movie" ? "영화" : "TV 프로그램"}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>검색 결과가 없습니다.</div>
        )}
      </section>
    </main>
  );
}
