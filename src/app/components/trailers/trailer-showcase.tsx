"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { ProgramSummary } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";
import { programHref, releaseYear } from "@/app/lib/programUrls";
import TrailerStage from "./trailer-stage";
import TrailerPlaylist from "./trailer-playlist";
import styles from "./trailer-showcase.module.css";

type TrailerShowcaseProps = {
  /** 서버에서 고른 예고편 목록 (예고편 키 있음, 중복 제거됨) */
  programs: ProgramSummary[];
};

//* 예고편 쇼케이스: 플레이어(왼쪽) + 재생 목록(오른쪽).
//* 데이터는 서버 컴포넌트(TrailerShowcaseSection)가 props로 넘기므로 클라이언트 fetch가 없다.
//* 재생은 사용자가 시작할 때만 YouTube를 불러오고, 시작한 뒤에는 목록 전환/영상 종료 시 자동으로 이어진다.
export default function TrailerShowcase({ programs }: TrailerShowcaseProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const count = programs.length;
  const current = programs[Math.min(selectedIndex, Math.max(0, count - 1))];

  const goNext = useCallback(() => {
    setSelectedIndex((index) => (count === 0 ? 0 : (index + 1) % count));
  }, [count]);

  if (!current?.trailerKey) return null;

  const year = releaseYear(current.releaseDate);
  const providers = Array.from(
    new Set(current.providers.map((p) => normalizeProviderName(p.providerName))),
  );

  return (
    <div className={styles.showcaseLayout}>
      <div className={styles.playerPane}>
        <TrailerStage
          videoId={current.trailerKey}
          title={current.title}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onEnded={goNext}
        />
        <div className={styles.caption}>
          <div className={styles.captionText}>
            <p className={styles.captionKicker}>NOW PLAYING</p>
            <h2 className={styles.captionTitle}>{current.title}</h2>
            <p className={styles.captionMeta}>
              <span>{current.mediaType === "movie" ? "영화" : "TV 프로그램"}</span>
              {year && <span>{year}</span>}
              {providers.length > 0 && <span>{providers.join(" · ")}</span>}
            </p>
          </div>
          <Link href={programHref(current.id, current.mediaType)} className={styles.captionLink}>
            상세 보기 <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </div>
      <div className={styles.listPane}>
        <TrailerPlaylist programs={programs} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      </div>
    </div>
  );
}
