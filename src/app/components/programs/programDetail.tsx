import Image from "next/image";
import type { ProgramType } from "@/app/types/types";
import styles from "./programDetail.module.css";

export default async function ProgramDetail({
  programId,
  kind,
}: {
  programId: string;
  kind?: string;
}) {
  const program = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/getProgramById?id=${programId}&kind=${kind}`,
  );
  if (!program.ok) {
    throw new Error(`Failed to fetch program: ${program.status}`);
  }

  const programData: ProgramType = await program.json();

  const date = programData.releaseDate ?? programData.firstAirDate;
  const releaseYear = date ? new Date(date).getFullYear() : null;
  const providers = programData.providers
    .map((provider) => provider.provider.providerName)
    .filter(Boolean);

  const posterSrc = programData.posterPath
    ? `https://image.tmdb.org/t/p/w780${programData.posterPath}`
    : null;
    
  const genreDetails = programData.genres.map((genre) => genre.genre);
  const genreNames = genreDetails.map((genre) => genre.name).filter(Boolean);
  return (
    <article className={styles.detail}>
      <div className={styles.hero}>
        <div className={styles.posterFrame}>
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={`${programData.title} 포스터`}
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
          <h1>{programData.title}</h1>
          {programData.originalTitle && (
            <p className={styles.originalTitle}>{programData.originalTitle}</p>
          )}
          <div className={styles.meta}>
            <span className={styles.rating}>
              <span aria-hidden="true">★</span>{" "}
              {programData.voteAverage.toFixed(1)}
            </span>
            {releaseYear && <span>{releaseYear}</span>}
            {genreNames.length > 0 && (
              <span>{genreNames.slice(0, 2).join(" · ")}</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.overviewSection}>
          <p className={styles.sectionLabel}>STORY</p>
          <p className={styles.overview}>
            {programData.overview || "등록된 줄거리 정보가 없습니다."}
          </p>
        </section>

        <div className={styles.infoGrid}>
          <section>
            <p className={styles.sectionLabel}>GENRES</p>
            <p className={styles.infoValue}>
              {genreNames.join(" · ") || "정보 없음"}
            </p>
          </section>
          <section>
            <p className={styles.sectionLabel}>WATCH ON</p>
            <p className={styles.infoValue}>
              {providers.join(" · ") || "정보 없음"}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
