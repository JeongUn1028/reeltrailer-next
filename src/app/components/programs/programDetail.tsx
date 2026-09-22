import Image from "next/image";
import { notFound } from "next/navigation";
import type { ProgramDetail as ProgramDetailData, ProgramSummary } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";
import {
  backdropUrl,
  genreLabel,
  ottSearchUrl,
  posterUrl,
  releaseYear,
} from "@/app/lib/programUrls";
import { getProgramById, getSimilarPrograms } from "@/server/contents";
import ProgramRow from "./program-row";
import TrailerPlayer from "./trailer-player";
import styles from "./programDetail.module.css";

interface ProgramDetailViewProps {
  program: ProgramDetailData;
  similar: ProgramSummary[];
}

const fetchProgramById = async (
  programId: string,
  kind: "movie" | "tvshow",
): Promise<ProgramDetailData> => {
  //* programId가 0이 아닌 자연수인지 검사
  if (!/^[1-9]\d*$/.test(programId)) {
    notFound();
  }
  // DB 오류는 여기서 잡지 않고 error.tsx로 전파. 조회 결과가 없을 때만 404
  const program = await getProgramById(Number(programId), kind);
  if (!program) {
    notFound();
  }
  return program;
};

//* 제공자 이름 정규화 + 중복 제거 (Netflix / Netflix Standard with Ads 등)
function uniqueProviders(program: ProgramDetailData) {
  const seen = new Map<string, string | null>();
  for (const provider of program.providers) {
    const name = normalizeProviderName(provider.providerName);
    if (!seen.has(name)) {
      seen.set(name, ottSearchUrl(name, program.title));
    }
  }
  return Array.from(seen.entries()).map(([name, href]) => ({ name, href }));
}

export function ProgramDetailView({ program, similar }: ProgramDetailViewProps) {
  const year = releaseYear(program.releaseDate);
  const genreNames = program.genres.map((g) => genreLabel(g.id, g.name));
  const providers = uniqueProviders(program);
  const posterSrc = posterUrl(program.posterPath, "w780");
  const backdropSrc = backdropUrl(program.backdropPath, "w1280");
  const kindLabel = program.mediaType === "movie" ? "MOVIE" : "TV SHOW";

  return (
    <article className={styles.detail}>
      <div className={styles.hero}>
        {backdropSrc && (
          <Image
            src={backdropSrc}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 58rem"
            className={styles.backdrop}
            priority
          />
        )}
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <div className={styles.posterFrame}>
            {posterSrc ? (
              <Image
                src={posterSrc}
                alt={`${program.title} 포스터`}
                fill
                sizes="(max-width: 700px) 42vw, 260px"
                className={styles.poster}
                priority
              />
            ) : (
              <div className={styles.posterFallback}>NO IMAGE</div>
            )}
          </div>

          <div className={styles.heading}>
            <p className={styles.kicker}>{kindLabel}</p>
            <h1>{program.title}</h1>
            {program.originalTitle && program.originalTitle !== program.title && (
              <p className={styles.originalTitle}>{program.originalTitle}</p>
            )}
            <div className={styles.meta}>
              {program.voteAverage > 0 && (
                <span className={styles.rating}>
                  <span aria-hidden="true">★</span> {program.voteAverage.toFixed(1)}
                  {program.voteCount > 0 && (
                    <span className={styles.voteCount}>
                      ({program.voteCount.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {year && <span>{year}</span>}
              {genreNames.length > 0 && <span>{genreNames.slice(0, 2).join(" · ")}</span>}
            </div>

            {providers.length > 0 && (
              <ul className={styles.providerList} aria-label="시청 가능한 OTT">
                {providers.map(({ name, href }) => (
                  <li key={name}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.providerLink}
                      >
                        {name}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className={styles.providerLink}>{name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {program.trailerKey && (
          <section className={styles.trailerSection}>
            <p className={styles.sectionLabel}>TRAILER</p>
            <TrailerPlayer
              trailerKey={program.trailerKey}
              title={program.title}
              posterSrc={backdropSrc ?? posterSrc}
            />
          </section>
        )}

        <section className={styles.overviewSection}>
          <p className={styles.sectionLabel}>STORY</p>
          <p className={styles.overview}>
            {program.overview || "등록된 줄거리 정보가 없습니다."}
          </p>
        </section>

        <div className={styles.infoGrid}>
          <section>
            <p className={styles.sectionLabel}>GENRES</p>
            <p className={styles.infoValue}>{genreNames.join(" · ") || "정보 없음"}</p>
          </section>
          <section>
            <p className={styles.sectionLabel}>WATCH ON</p>
            <p className={styles.infoValue}>
              {providers.map((p) => p.name).join(" · ") || "정보 없음"}
            </p>
          </section>
        </div>

        {similar.length > 0 && (
          <div className={styles.similar}>
            <ProgramRow title="비슷한 콘텐츠" programs={similar} />
          </div>
        )}
      </div>
    </article>
  );
}

export default async function ProgramDetail({
  programId,
  kind,
}: {
  programId: string;
  kind: "movie" | "tvshow";
}) {
  const program = await fetchProgramById(programId, kind);
  const similar = await getSimilarPrograms(program);

  return <ProgramDetailView program={program} similar={similar} />;
}
