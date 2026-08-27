import Image from "next/image";
import styles from "./carousel-list.module.css";
import { Dispatch, SetStateAction } from "react";
import type { ProgramType } from "@/app/types/types";

type CarouselListProps = {
  programs: ProgramType[];
  selectedVideoId: string;
  onSelectVideo: Dispatch<SetStateAction<string>>;
};

function normalizeProviderName(providerName: string) {
  const normalizedName = providerName.trim().toLowerCase();

  if (
    normalizedName === "netflix" ||
    normalizedName === "netflix standard with ads"
  ) {
    return "Netflix";
  }

  return providerName;
}

export default function CarouselList({
  programs,
  selectedVideoId,
  onSelectVideo,
}: CarouselListProps) {
  return (
    <section className={styles.railSection} aria-label="Trailer carousel list">
      <h3 className={styles.railTitle}>추천하는 영상 목록</h3>
      <p className={styles.railCount}>{programs.length} videos</p>
      <div className={styles.railTrack}>
        {programs.map((program) => {
          const isActive = selectedVideoId === program.trailerKey;

          return (
            <button
              key={program.trailerKey}
              type="button"
              className={`${styles.cardButton} ${isActive ? styles.cardActive : ""}`}
              onClick={() => {
                if (program.trailerKey) {
                  onSelectVideo(program.trailerKey);
                }
              }}
              aria-pressed={isActive}
            >
              <Image
                src={`https://i.ytimg.com/vi/${program.trailerKey}/hqdefault.jpg`}
                alt={`Trailer ${program.title}`}
                className={styles.thumbnail}
                width={480}
                height={270}
                loading="eager"
              />
              <div className={styles.cardInfo}>
                <span className={styles.cardMeta}>{program.title}</span>
                <span className={styles.cardMeta}>
                  {Array.from(
                    new Set(
                      program.providers.map((provider) =>
                        normalizeProviderName(provider.provider.providerName),
                      ),
                    ),
                  ).join(", ")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
