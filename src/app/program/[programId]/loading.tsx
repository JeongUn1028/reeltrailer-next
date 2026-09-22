import ProgramDetailSkeleton from "@/app/components/skeleton/program-detail-skeleton";
import styles from "@/app/components/programs/programDetail.module.css";

export default function Loading() {
  return (
    <main className={styles.standalonePage}>
      <div className={styles.detail}>
        <ProgramDetailSkeleton />
      </div>
    </main>
  );
}
