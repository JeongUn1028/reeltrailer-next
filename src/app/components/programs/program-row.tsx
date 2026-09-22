import Link from "next/link";
import Program from "./program";
import ScrollRow from "./scroll-row";
import type { ProgramSummary } from "@/app/types/types";
import styles from "./program-row.module.css";

type ProgramRowProps = {
  title: string;
  programs: ProgramSummary[];
  /** "더 보기" 링크. 없으면 표시하지 않음 */
  moreHref?: string;
  /** 첫 화면에 보이는 행이면 앞쪽 카드 이미지를 우선 로드 */
  priorityCount?: number;
};

//* 가로 스크롤 카드 행. 데이터가 없으면 아무것도 렌더링하지 않음
export default function ProgramRow({
  title,
  programs,
  moreHref,
  priorityCount = 0,
}: ProgramRowProps) {
  if (programs.length === 0) return null;

  return (
    <section className={styles.container} aria-label={title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {moreHref && (
          <Link href={moreHref} className={styles.more}>
            더 보기
            <span aria-hidden="true">-&gt;</span>
          </Link>
        )}
      </div>
      <ScrollRow label={title}>
        {programs.map((program, index) => (
          <Program
            key={`${program.mediaType}-${program.id}`}
            program={program}
            priority={index < priorityCount}
          />
        ))}
      </ScrollRow>
    </section>
  );
}
