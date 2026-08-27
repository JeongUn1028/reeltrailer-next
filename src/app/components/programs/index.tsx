import Program from "./program";
import styles from "./index.module.css";
import type { ProgramType } from "@/app/types/types";

export default function Programs({ programs }: { programs: ProgramType[] }) {
  return (
    <div className={styles.container}>
      <div>
        <div className={styles.title}>추천하는 영화</div>
      </div>
      <div className={styles.programContainer}>
        {programs?.map((program) => (
          <Program key={program.id} props={program} />
        ))}
      </div>
    </div>
  );
}
