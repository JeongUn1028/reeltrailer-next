import Image from "next/image";
import styles from "./trailer-playlist.module.css";
import { Dispatch, SetStateAction } from "react";
import type { ProgramSummary } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";

type TrailerPlaylistProps = {
  programs: ProgramSummary[];
  selectedVideoId: string;
  onSelectVideo: Dispatch<SetStateAction<string>>;
};

//* 예고편 재생 목록. 항목을 고르면 TrailerStage의 영상이 바뀐다.
export default function TrailerPlaylist({
  programs,
  selectedVideoId,
  onSelectVideo,
}: TrailerPlaylistProps) {
  return (
    <section className={styles.railSection} aria-label="Trailer playlist">
      <h3 className={styles.railTitle}>추천하는 영상 목록</h3>
      <p className={styles.railCount}>{programs.length} videos</p>
      <div className={styles.railTrack}>
        {programs.map((program, index) => {
          const isActive = selectedVideoId === program.trailerKey;

          return (
            <button
              key={`${program.mediaType}-${program.id}`}
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
                priority={index === 0}
              />
              <div className={styles.cardInfo}>
                <span className={styles.cardMeta}>{program.title}</span>
                <span className={styles.cardMeta}>
                  {Array.from(
                    new Set(
                      program.providers.map((provider) =>
                        normalizeProviderName(provider.providerName),
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
