import styles from "./trailer-stage.module.css";
import YouTubeEmbed from "./youtubeEmbed";

//* 선택된 예고편을 재생하는 플레이어 영역
export default function TrailerStage({ videoId }: { videoId: string }) {
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
