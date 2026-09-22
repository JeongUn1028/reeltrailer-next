"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./trailer-player.module.css";

type TrailerPlayerProps = {
  trailerKey: string;
  title: string;
  /** 재생 전 표시할 썸네일. 없으면 YouTube 썸네일 사용 */
  posterSrc?: string | null;
};

//* 예고편 재생 영역. 클릭 전에는 썸네일만 보여주고, 클릭 시 YouTube iframe을 로드한다.
export default function TrailerPlayer({
  trailerKey,
  title,
  posterSrc,
}: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnail = posterSrc ?? `https://i.ytimg.com/vi/${trailerKey}/hqdefault.jpg`;

  if (isPlaying) {
    return (
      <div className={styles.frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={`${title} 예고편`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.frame} ${styles.button}`}
      onClick={() => setIsPlaying(true)}
      aria-label={`${title} 예고편 재생`}
    >
      <Image
        src={thumbnail}
        alt=""
        fill
        sizes="(max-width: 700px) 100vw, 58rem"
        className={styles.thumbnail}
      />
      <span className={styles.playBadge}>
        <span aria-hidden="true" className={styles.playIcon} />
        예고편 재생
      </span>
    </button>
  );
}
