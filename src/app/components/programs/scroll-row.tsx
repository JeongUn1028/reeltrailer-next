"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./scroll-row.module.css";

type ScrollRowProps = {
  /** 버튼 aria-label 접두어 (행 제목) */
  label: string;
  children: ReactNode;
};

//* 가로 스크롤 트랙 + 좌/우 화살표 버튼. 스크롤 위치에 따라 버튼을 비활성화하고,
//* 내용이 한 화면에 다 들어가면 버튼을 숨긴다. 트랙은 scroll-snap으로 카드가 잘리지 않게 멈춘다.
export default function ScrollRow({ label, children }: ScrollRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ canPrev: false, canNext: false });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const next = { canPrev: track.scrollLeft > 4, canNext: track.scrollLeft < maxScroll - 4 };
    setState((prev) => (prev.canPrev === next.canPrev && prev.canNext === next.canNext ? prev : next));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => observer.disconnect();
  }, [update]);

  //* 한 번에 "완전히 보이는 카드 수"만큼 이동해 카드가 가장자리에서 잘리지 않게 한다.
  //* 카드 폭을 알 수 없으면(레이아웃 전) 보이는 폭의 90%로 대체
  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const cardWidth = first?.getBoundingClientRect().width ?? 0;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const step = cardWidth > 0 ? Math.max(1, Math.floor((track.clientWidth + gap) / (cardWidth + gap))) * (cardWidth + gap) : Math.round(track.clientWidth * 0.9);
    track.scrollBy({ left: Math.round(step) * direction, behavior: "smooth" });
  };

  const showButtons = state.canPrev || state.canNext;

  return (
    <div className={styles.wrapper}>
      {showButtons && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.prev}`}
          onClick={() => scrollByPage(-1)}
          disabled={!state.canPrev}
          aria-label={`${label} 이전`}
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>
      )}
      <div ref={trackRef} className={styles.track} onScroll={update} data-testid="scroll-track">
        {children}
      </div>
      {showButtons && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.next}`}
          onClick={() => scrollByPage(1)}
          disabled={!state.canNext}
          aria-label={`${label} 다음`}
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      )}
    </div>
  );
}
