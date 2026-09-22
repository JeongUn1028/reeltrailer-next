import styles from "./program-detail-skeleton.module.css";

//* 상세 화면(모달/페이지)이 서버에서 준비되는 동안 보여주는 스켈레톤
export default function ProgramDetailSkeleton() {
  return (
    <div className={styles.wrapper} aria-busy="true" aria-label="상세 정보 불러오는 중">
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <div className={`${styles.bar} ${styles.kicker}`} />
          <div className={`${styles.bar} ${styles.title}`} />
          <div className={`${styles.bar} ${styles.meta}`} />
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.side}>
          <div className={styles.poster} />
          <div className={`${styles.bar} ${styles.chip}`} />
          <div className={`${styles.bar} ${styles.chip}`} />
        </div>
        <div className={styles.main}>
          <div className={`${styles.bar} ${styles.label}`} />
          <div className={`${styles.bar} ${styles.line}`} />
          <div className={`${styles.bar} ${styles.line}`} />
          <div className={`${styles.bar} ${styles.lineShort}`} />
          <div className={styles.rows}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`${styles.bar} ${styles.row}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
