"use client";

import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ProgramSummary } from "@/app/types/types";
import TrailerStage from "./trailer-stage";
import TrailerPlaylist from "./trailer-playlist";
import styles from "./trailer-showcase.module.css";
import constants from "../../../config/ott-provider-ids.json";

//* url 생성 함수
function buildUrl(ott: string | undefined) {
  const params = new URLSearchParams();
  params.append("page", "1");
  params.append("limit", "20");

  if (ott) {
    const ottName = ott as keyof typeof constants;
    const providerId = constants[ottName];
    if (providerId) {
      params.append("providerId", providerId as string);
    }
  }

  // 환경 변수가 없으면 같은 origin의 /api를 사용 (로컬 개발 시 "undefined/..." URL 방지)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  return `${baseUrl}/getMoviesList?${params.toString()}`;
}

//* 영화 정보를 가져오는 함수
const fetchMovies = async (ott: string | undefined): Promise<ProgramSummary[]> => {
  const url = buildUrl(ott);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("영화 정보를 가져오지 못했습니다.");
  }

  const { movies } = (await response.json()) as { movies: ProgramSummary[] };
  return movies || [];
};

//* 예고편 쇼케이스: 인기 영화 예고편 플레이어(왼쪽) + 재생 목록(오른쪽)
export default function TrailerShowcase() {
  const params = useParams();
  const ott = typeof params?.ott === "string" ? params.ott : undefined;

  const { data } = useSuspenseQuery({
    queryKey: ["movies", ott],
    queryFn: () => fetchMovies(ott),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    gcTime: 1000 * 60 * 10,
    retry: 1, // 에러 발생 시 최대 1회만 재시도
  });

  const programs = useMemo(
    () => data.filter((movie) => movie.trailerKey != null),
    [data],
  );

  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  const currentVideoId =
    selectedVideoId && programs.some((p) => p.trailerKey === selectedVideoId)
      ? selectedVideoId
      : programs[0]?.trailerKey || "";

  return (
    <div className={styles.showcaseLayout}>
      <div className={styles.playerPane}>
        <TrailerStage videoId={currentVideoId} />
      </div>
      <div className={styles.listPane}>
        <TrailerPlaylist
          programs={programs}
          selectedVideoId={currentVideoId}
          onSelectVideo={setSelectedVideoId}
        />
      </div>
    </div>
  );
}
