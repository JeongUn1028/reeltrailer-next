import styles from "./search-bar-skeleton.module.css";

export default function SearchBarSkeleton() {
  return (
    <div
      className={styles.container}
      aria-busy="true"
      aria-label="Loading search"
    >
      <div className={styles.input} />
      <div className={styles.button} />
    </div>
  );
}
