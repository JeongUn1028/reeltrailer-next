"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import Image from "next/image";
import type { ProgramSummary } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";
import { releaseYear } from "@/app/lib/programUrls";
import styles from "./trailer-playlist.module.css";

type TrailerPlaylistProps = {
  programs: ProgramSummary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

//* 제공자 이름을 정규화하고 중복을 제거해 "Netflix, TVING" 형태로
function providerLabel(program: ProgramSummary) {
  return Array.from(
    new Set(program.providers.map((p) => normalizeProviderName(p.providerName))),
  ).join(", ");
}

//* 예고편 재생 목록. 항목을 고르면 TrailerStage의 영상이 바뀐다.
//* listbox/option 패턴: ↑↓ 키로 이동, 선택 항목은 자동으로 보이는 위치로 스크롤
export default function TrailerPlaylist({ programs, selectedIndex, onSelect }: TrailerPlaylistProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (programs.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onSelect((selectedIndex + 1) % programs.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onSelect((selectedIndex - 1 + programs.length) % programs.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      onSelect(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onSelect(programs.length - 1);
    }
  };

  return (
    <section className={styles.railSection} aria-labelledby="trailer-playlist-title">
      <h3 id="trailer-playlist-title" className={styles.railTitle}>
        예고편 목록
      </h3>
      <p className={styles.railCount}>{programs.length}편</p>
      <div
        className={styles.railTrack}
        role="listbox"
        aria-label="예고편 목록"
        aria-activedescendant={`trailer-option-${selectedIndex}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {programs.map((program, index) => {
          const isActive = index === selectedIndex;
          const year = releaseYear(program.releaseDate);

          return (
            <button
              key={`${program.mediaType}-${program.id}`}
              id={`trailer-option-${index}`}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={isActive}
              tabIndex={-1}
              className={`${styles.cardButton} ${isActive ? styles.cardActive : ""}`}
              onClick={() => onSelect(index)}
            >
              <Image
                src={`https://i.ytimg.com/vi/${program.trailerKey}/mqdefault.jpg`}
                alt={`${program.title} 예고편 썸네일`}
                className={styles.thumbnail}
                width={320}
                height={180}
                priority={index < 3}
              />
              <div className={styles.cardInfo}>
                <span className={styles.cardTitle}>{program.title}</span>
                <span className={styles.cardMeta}>
                  <span>{program.mediaType === "movie" ? "영화" : "TV"}</span>
                  {year && <span>{year}</span>}
                </span>
                {program.providers.length > 0 && (
                  <span className={styles.cardProviders}>{providerLabel(program)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
