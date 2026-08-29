import styles from "./programs-skeleton.module.css";

const sections = Array.from({ length: 3 }, (_, index) => index);
const cards = Array.from({ length: 6 }, (_, index) => index);

export default function ProgramsSkeleton() {
  return (
    <div
      className={styles.container}
      aria-busy="true"
      aria-label="Loading recommendations"
    >
      {sections.map((section) => (
        <section className={styles.section} key={section}>
          <div className={styles.titleSkeleton} />
          <div className={styles.programContainer}>
            {cards.map((card) => (
              <div className={styles.cardSkeleton} key={card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
