import Image from "next/image";
import type { ProgramType } from "@/app/types/types";
import styles from "./program.module.css";

export default function Program({ props }: { props: ProgramType }) {
  const posterSrc = props.posterPath
    ? props.posterPath.startsWith("http")
      ? props.posterPath
      : `https://image.tmdb.org/t/p/w500${props.posterPath}`
    : null;

  return (
    <div className={styles.card}>
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={props.title}
          width={100}
          height={50}
          className={styles.image}
        />
      ) : (
        <div className={styles.fallback}>No Image</div>
      )}
    </div>
  );
}
