import Image from "next/image";
import { notFound } from "next/navigation";
import type { ProgramType } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";
import { getProgramById } from "@/server/contents";
import styles from "./programDetail.module.css";

interface ProgramDetailViewProps {
  kind: "movie" | "tvshow";
  title?: string;
  originalTitle?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  releaseYear: number | null;
  genreDetails: string[];
  normalizedProviders: string[];
  posterSrc: string | null;
}

const fetchProgramById = async (
  programId: string,
  kind: string,
): Promise<ProgramType> => {
  //* programId가 0이 아닌 자연수를 검사,

  const isValidId = /^[1-9]\d*$/.test(programId);
  const isValidKind = kind === "movie" || kind === "tvshow";
  if (!isValidId || !isValidKind) {
    console.error("Invalid programId or kind");
    notFound();
  }
  try {
    const program = await getProgramById(Number(programId), kind);
    if (!program) {
      notFound();
    }
    return program;
  } catch (error) {
    console.error("Error fetching program:", error);
    notFound();
  }
};

const formatProgramData = (programData: ProgramType) => {
  const date = programData.releaseDate ?? programData.firstAirDate;
  const releaseYear = date ? new Date(date).getFullYear() : null;
  const genreDetails = programData.genres?.map((genre) => genre.name) || [];
  const providers =
    programData.providers
      ?.map((provider) => provider.providerName)
      .filter(Boolean) || [];
  const normalizedProviders = providers.map(normalizeProviderName);
  const posterSrc = programData.posterPath
    ? `https://image.tmdb.org/t/p/w780${programData.posterPath}`
    : null;

  return {
    ...programData,
    releaseYear,
    genreDetails,
    normalizedProviders,
    posterSrc,
  };
};

export function ProgramDetailView({
  kind,
  title,
  originalTitle,
  overview,
  voteAverage,
  releaseYear,
  genreDetails,
  normalizedProviders,
  posterSrc,
}: ProgramDetailViewProps) {
  return (
    <article className={styles.detail}>
      <div className={styles.hero}>
        <div className={styles.posterFrame}>
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={`${title} 포스터`}
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
          <p className={styles.kicker}>
            {kind === "movie" ? "MOVIE" : "TV SHOW"}
          </p>
          <h1>{title}</h1>
          {originalTitle && (
            <p className={styles.originalTitle}>{originalTitle}</p>
          )}
          <div className={styles.meta}>
            <span className={styles.rating}>
              <span aria-hidden="true">★</span> {voteAverage?.toFixed(1)}
            </span>
            {releaseYear && <span>{releaseYear}</span>}
            {genreDetails?.length > 0 && (
              <span>{genreDetails?.slice(0, 2).join(" · ")}</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.overviewSection}>
          <p className={styles.sectionLabel}>STORY</p>
          <p className={styles.overview}>
            {overview || "등록된 줄거리 정보가 없습니다."}
          </p>
        </section>

        <div className={styles.infoGrid}>
          <section>
            <p className={styles.sectionLabel}>GENRES</p>
            <p className={styles.infoValue}>
              {genreDetails?.join(" · ") || "정보 없음"}
            </p>
          </section>
          <section>
            <p className={styles.sectionLabel}>WATCH ON</p>
            <p className={styles.infoValue}>
              {normalizedProviders.join(" · ") || "정보 없음"}
            </p>
          </section>
        </div>
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
  const programData: ProgramType = await fetchProgramById(programId, kind);
  const formattedProgramData = formatProgramData(programData);

  return <ProgramDetailView kind={kind} {...formattedProgramData} />;
}
