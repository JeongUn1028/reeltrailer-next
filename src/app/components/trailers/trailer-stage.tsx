"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { loadYouTubeApi } from "./youtube-player";
import styles from "./trailer-stage.module.css";

type TrailerStageProps = {
  videoId: string;
  title: string;
  /** true가 되는 순간 플레이어를 만들고 재생한다. 이후 videoId가 바뀌면 같은 플레이어에서 전환 */
  isPlaying: boolean;
  onPlay: () => void;
  /** 영상이 끝났을 때 (연속 재생용) */
  onEnded: () => void;
};

//* 선택된 예고편을 보여주는 플레이어 영역.
//* 재생 전에는 썸네일 + 재생 버튼만 두어 YouTube 리소스(약 3MB)를 불러오지 않는다.
export default function TrailerStage({ videoId, title, isPlaying, onPlay, onEnded }: TrailerStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onEnded);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // 재생 시작: API 로드 → 플레이어 생성 (한 번만)
  useEffect(() => {
    if (!isPlaying || playerRef.current || !mountRef.current) return;
    let cancelled = false;
    const mount = mountRef.current;

    loadYouTubeApi()
      .then((yt) => {
        if (cancelled) return;
        playerRef.current = new yt.Player(mount, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (event) => {
              if (event.data === yt.PlayerState.ENDED) onEndedRef.current();
            },
          },
        });
      })
      .catch((error) => {
        console.error("[TrailerStage] YouTube 플레이어 초기화 실패:", error);
        if (!cancelled) setPlayerError(true);
      });

    return () => {
      cancelled = true;
    };
    // videoId는 생성 시점 값만 쓰고, 이후 변경은 아래 effect가 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // 재생 중 선택이 바뀌면 같은 플레이어에서 영상 전환
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId, isPlaying]);

  // 언마운트 시 플레이어 정리
  useEffect(
    () => () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  const thumbnail = thumbnailFailed
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <section className={styles.heroSection} aria-label="예고편 플레이어">
      <div className={styles.heroGlow} />
      <div className={styles.playerShell}>
        <div className={styles.playerFrame}>
          {/* YT.Player가 이 div를 iframe으로 교체한다 */}
          <div ref={mountRef} className={styles.playerMount} hidden={!isPlaying} />

          {!isPlaying && (
            <button
              type="button"
              className={styles.posterButton}
              onClick={onPlay}
              aria-label={`${title} 예고편 재생`}
            >
              <Image
                key={thumbnail}
                src={thumbnail}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 60vw"
                className={styles.poster}
                priority
                onError={() => setThumbnailFailed(true)}
              />
              <span className={styles.playBadge}>
                <span aria-hidden="true" className={styles.playIcon} />
                예고편 재생
              </span>
            </button>
          )}

          {isPlaying && playerError && (
            <a
              className={styles.fallbackLink}
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              플레이어를 불러오지 못했습니다. YouTube에서 보기 ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
