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
import DetailHero from "./detail-hero";
import Program from "./program";
import styles from "./programDetail.module.css";

//* 비슷한 콘텐츠 그리드에 보여줄 최대 개수 (2줄)
const SIMILAR_LIMIT = 12;

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

//* 서버/클라이언트가 같은 문자열을 만들도록 로케일 없이 YYYY.MM.DD로 포맷
function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

export function ProgramDetailView({ program, similar }: ProgramDetailViewProps) {
  const year = releaseYear(program.releaseDate);
  const fullDate = formatDate(program.releaseDate);
  const genreNames = program.genres.map((g) => genreLabel(g.id, g.name));
  const providers = uniqueProviders(program);
  const posterSrc = posterUrl(program.posterPath, "w780");
  const backdropSrc = backdropUrl(program.backdropPath, "w1280");
  const isMovie = program.mediaType === "movie";
  const hasRating = program.voteAverage > 0;

  return (
    <article className={styles.detail}>
      <DetailHero
        backdropSrc={backdropSrc}
        posterSrc={posterSrc}
        trailerKey={program.trailerKey}
        title={program.title}
      >
        <p className={styles.kicker}>{isMovie ? "MOVIE" : "TV SHOW"}</p>
        <h1 className={styles.title}>{program.title}</h1>
        {program.originalTitle && program.originalTitle !== program.title && (
          <p className={styles.originalTitle}>{program.originalTitle}</p>
        )}
        <p className={styles.meta}>
          {hasRating && (
            <span className={styles.rating}>
              <span aria-hidden="true">★</span> {program.voteAverage.toFixed(1)}
            </span>
          )}
          {year && <span>{year}</span>}
          {genreNames.slice(0, 2).map((name) => (
            <span key={name}>{name}</span>
          ))}
        </p>
      </DetailHero>

      <div className={styles.body}>
        <aside className={styles.side}>
          <div className={styles.posterFrame}>
            {posterSrc ? (
              <Image
                src={posterSrc}
                alt={`${program.title} 포스터`}
                fill
                sizes="(max-width: 700px) 36vw, 220px"
                className={styles.poster}
              />
            ) : (
              <div className={styles.posterFallback}>NO IMAGE</div>
            )}
          </div>

          <section className={styles.watch}>
            <p className={styles.sectionLabel}>시청하기</p>
            {providers.length > 0 ? (
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
                        <span>{name}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className={styles.providerLink}>
                        <span>{name}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>현재 제공 중인 OTT가 없습니다.</p>
            )}
          </section>
        </aside>

        <div className={styles.main}>
          <section>
            <p className={styles.sectionLabel}>줄거리</p>
            <p className={styles.overview}>
              {program.overview || "등록된 줄거리 정보가 없습니다."}
            </p>
          </section>

          <dl className={styles.infoList} aria-label="상세 정보" role="list">
            <div className={styles.infoRow}>
              <dt>유형</dt>
              <dd>{isMovie ? "영화" : "TV 프로그램"}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>공개일</dt>
              <dd>{fullDate ?? "정보 없음"}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>평가</dt>
              <dd>
                {hasRating ? (
                  <>
                    <span className={styles.rating}>
                      <span aria-hidden="true">★</span> {program.voteAverage.toFixed(1)}
                    </span>
                    {program.voteCount > 0 && (
                      <span className={styles.muted}> · {program.voteCount.toLocaleString()}명 참여</span>
                    )}
                  </>
                ) : (
                  "정보 없음"
                )}
              </dd>
            </div>
            <div className={styles.infoRow}>
              <dt>장르</dt>
              <dd>{genreNames.join(" · ") || "정보 없음"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {similar.length > 0 && (
        <section className={styles.similar} aria-labelledby="similar-title">
          <h2 id="similar-title" className={styles.similarTitle}>
            비슷한 콘텐츠
          </h2>
          <div className={styles.similarGrid}>
            {similar.slice(0, SIMILAR_LIMIT).map((item) => (
              <Program key={`${item.mediaType}-${item.id}`} program={item} />
            ))}
          </div>
        </section>
      )}
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
  const similar = await getSimilarPrograms(program, SIMILAR_LIMIT);

  return <ProgramDetailView program={program} similar={similar} />;
}
