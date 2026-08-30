import Image from "next/image";
import Link from "next/link";
import type { ProgramType } from "@/app/types/types";
import styles from "./program.module.css";

export default function Program({
  props,
  title,
}: {
  props: ProgramType;
  title: string;
}) {
  const posterSrc = props.posterPath
    ? props.posterPath.startsWith("http")
      ? props.posterPath
      : `https://image.tmdb.org/t/p/w500${props.posterPath}`
    : null;
  const kind = props.mediaType ?? (title === "영화" ? "movie" : "tvshow");

  return (
    <Link href={`/program/${props.id}?kind=${kind}`}>
      <div className={styles.card}>
        {posterSrc ? (
          <Image
            src={posterSrc}
            title={props.title ?? ""}
            alt={props.title ?? ""}
            width={100}
            height={50}
            className={styles.image}
          />
        ) : (
          <div className={styles.fallback}>No Image</div>
        )}
      </div>
    </Link>
  );
}
