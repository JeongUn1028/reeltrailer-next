"use client";

import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ProgramType } from "@/app/types/types";
import Carousel from "./carousel";
import CarouselList from "./carousel-list";
import styles from "./index.module.css";
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

  return `${process.env.NEXT_PUBLIC_API_URL}/api/getMovies?${params.toString()}`;
}

//* 영화 정보를 가져오는 함수
const fetchMovies = async (ott: string | undefined): Promise<ProgramType[]> => {
  const url = buildUrl(ott);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("영화 정보를 가져오지 못했습니다.");
  }

  const { movies } = (await response.json()) as { movies: ProgramType[] };
  return movies || [];
};

//* CarouselContainer 컴포넌트
export default function CarouselContainer() {
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
    () => data.filter((movie) => movie?.trailerKey != null),
    [data],
  );

  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  const currentVideoId =
    selectedVideoId && programs.some((p) => p.trailerKey === selectedVideoId)
      ? selectedVideoId
      : programs[0]?.trailerKey || "";

  return (
    <div className={styles.carouselLayout}>
      <div className={styles.playerPane}>
        <Carousel videoId={currentVideoId} />
      </div>
      <div className={styles.listPane}>
        <CarouselList
          programs={programs}
          selectedVideoId={currentVideoId}
          onSelectVideo={setSelectedVideoId}
        />
      </div>
    </div>
  );
}
