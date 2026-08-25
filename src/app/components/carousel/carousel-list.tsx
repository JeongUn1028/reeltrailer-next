import Image from "next/image";
import styles from "./carousel-list.module.css";

type CarouselListProps = {
  playList: string[];
  selectedVideoId: string;
  onSelectVideo: (videoId: string) => void;
};

export default function CarouselList({
  playList,
  selectedVideoId,
  onSelectVideo,
}: CarouselListProps) {
  return (
    <section className={styles.railSection} aria-label="Trailer carousel list">
      <h3 className={styles.railTitle}>추천하는 영상 목록</h3>
      <p className={styles.railCount}>{playList.length} videos</p>
      <div className={styles.railTrack}>
        {playList.map((videoId, index) => {
          const isActive = selectedVideoId === videoId;

          return (
            <button
              key={videoId}
              type="button"
              className={`${styles.cardButton} ${isActive ? styles.cardActive : ""}`}
              onClick={() => onSelectVideo(videoId)}
              aria-pressed={isActive}
            >
              <Image
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt={`Trailer ${index + 1}`}
                className={styles.thumbnail}
                width={480}
                height={270}
                loading="lazy"
              />
              <span className={styles.cardMeta}>Episode {index + 1}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
