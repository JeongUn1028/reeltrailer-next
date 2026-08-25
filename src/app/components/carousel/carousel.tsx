import styles from "./carousel.module.css";
import YouTubeEmbed from "./youtubeEmbed";

export default function Carousel({ videoId }: { videoId: string }) {
  return (
    <section className={styles.heroSection} aria-label="Featured trailer">
      <div className={styles.heroGlow} />
      <div className={styles.playerShell}>
        <div className={styles.playerFrame}>
          <YouTubeEmbed videoId={videoId} />
        </div>
      </div>
    </section>
  );
}
