import Image from "next/image";
import Link from "next/link";
import type { ProgramSummary } from "@/app/types/types";
import { posterUrl, programHref, releaseYear } from "@/app/lib/programUrls";
import ProviderBadges from "./provider-badges";
import styles from "./program.module.css";

type ProgramProps = {
  program: Pick<
    ProgramSummary,
    "id" | "mediaType" | "title" | "posterPath" | "releaseDate" | "voteAverage"
  > & { providers?: ProgramSummary["providers"] };
  /** 화면 상단(첫 화면)에 보이는 카드는 이미지를 우선 로드 */
  priority?: boolean;
};

export default function Program({ program, priority = false }: ProgramProps) {
  const posterSrc = posterUrl(program.posterPath, "w342");
  const year = releaseYear(program.releaseDate);
  const rating = program.voteAverage > 0 ? program.voteAverage.toFixed(1) : null;

  return (
    <Link
      href={programHref(program.id, program.mediaType)}
      className={styles.link}
      aria-label={`${program.title} 상세 보기`}
    >
      <div className={styles.card}>
        <div className={styles.posterBox}>
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={`${program.title} 포스터`}
              width={220}
              height={330}
              sizes="(max-width: 600px) 40vw, 220px"
              priority={priority}
              className={styles.image}
            />
          ) : (
            <div className={styles.fallback}>No Image</div>
          )}
          {program.providers && program.providers.length > 0 && (
            <div className={styles.badges}>
              <ProviderBadges providers={program.providers} />
            </div>
          )}
        </div>
        <div className={styles.info}>
          <p className={styles.title}>{program.title}</p>
          <p className={styles.meta}>
            <span>{program.mediaType === "movie" ? "영화" : "TV"}</span>
            {year && <span>{year}</span>}
            {rating && (
              <span className={styles.rating}>
                <span aria-hidden="true">★</span> {rating}
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
