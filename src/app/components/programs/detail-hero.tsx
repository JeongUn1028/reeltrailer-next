"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import styles from "./detail-hero.module.css";

type DetailHeroProps = {
  backdropSrc: string | null;
  posterSrc: string | null;
  trailerKey: string | null;
  title: string;
  /** backdrop 위에 겹쳐 보여줄 제목/메타 영역 */
  children: ReactNode;
};

//* 상세 화면 상단 히어로. backdrop 위에 제목을 겹쳐 보여주고,
//* 재생 버튼을 누르면 같은 자리에서 YouTube 예고편이 재생된다 (별도 TRAILER 섹션 없음).
export default function DetailHero({
  backdropSrc,
  posterSrc,
  trailerKey,
  title,
  children,
}: DetailHeroProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaSrc = backdropSrc ?? posterSrc;

  return (
    <div className={`${styles.hero} ${isPlaying ? styles.playing : ""}`} data-playing={isPlaying}>
      {isPlaying && trailerKey ? (
        <>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            title={`${title} 예고편`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.iframe}
          />
          <button
            type="button"
            className={styles.stopButton}
            onClick={() => setIsPlaying(false)}
            aria-label="예고편 닫기"
          >
            <span aria-hidden="true">✕</span> 예고편 닫기
          </button>
        </>
      ) : (
        <>
          {mediaSrc ? (
            <Image
              src={mediaSrc}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 96rem"
              className={`${styles.media} ${backdropSrc ? "" : styles.posterAsBackdrop}`}
              priority
            />
          ) : (
            <div className={styles.mediaFallback} />
          )}
          <div className={styles.shade} />
          {trailerKey && (
            <button
              type="button"
              className={styles.playButton}
              onClick={() => setIsPlaying(true)}
              aria-label={`${title} 예고편 재생`}
            >
              <span aria-hidden="true" className={styles.playIcon} />
              예고편 재생
            </button>
          )}
        </>
      )}

      <div className={styles.overlay} aria-hidden={isPlaying}>
        {children}
      </div>
    </div>
  );
}
