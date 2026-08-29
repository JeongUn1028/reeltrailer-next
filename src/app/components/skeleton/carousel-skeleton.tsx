import styles from "./index.module.css";

export default function CarouselSkeleton() {
  return (
    <div
      className={styles.carouselLayout}
      aria-busy="true"
      aria-label="Loading trailers"
    >
      <div className={styles.playerPane}>
        <div className={styles.playerSkeleton} />
      </div>
      <div className={styles.listPane}>
        <div className={styles.railSkeleton}>
          <div className={styles.titleSkeleton} />
          <div className={styles.countSkeleton} />
          <div className={styles.trackSkeleton}>
            {Array.from({ length: 4 }, (_, index) => (
              <div className={styles.cardSkeleton} key={index}>
                <div className={styles.thumbnailSkeleton} />
                <div className={styles.metaSkeleton} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
