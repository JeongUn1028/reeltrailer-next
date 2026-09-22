import type { ProgramKindFilter, ProgramSortKey } from "@/app/types/types";
import FilterChip from "./filter-chip";
import styles from "./filter-bar.module.css";

export const KIND_LABELS: Record<ProgramKindFilter, string> = {
  all: "전체",
  movie: "영화",
  tvshow: "TV",
};

export const SORT_LABELS: Record<ProgramSortKey, string> = {
  popular: "인기순",
  latest: "최신순",
  rating: "평점순",
};

type FilterBarProps = {
  kind: ProgramKindFilter;
  sort: ProgramSortKey;
  /** 현재 상태에서 kind/sort만 바꾼 URL을 만들어주는 함수 */
  buildHref: (next: { kind?: ProgramKindFilter; sort?: ProgramSortKey }) => string;
};

//* 콘텐츠 유형(전체/영화/TV)과 정렬 기준을 고르는 링크 그룹. 서버 컴포넌트.
export default function FilterBar({ kind, sort, buildHref }: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.group} role="group" aria-label="콘텐츠 유형">
        {(Object.keys(KIND_LABELS) as ProgramKindFilter[]).map((key) => (
          <FilterChip key={key} href={buildHref({ kind: key })} active={kind === key}>
            {KIND_LABELS[key]}
          </FilterChip>
        ))}
      </div>
      <div className={styles.group} role="group" aria-label="정렬">
        {(Object.keys(SORT_LABELS) as ProgramSortKey[]).map((key) => (
          <FilterChip key={key} href={buildHref({ sort: key })} active={sort === key}>
            {SORT_LABELS[key]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
