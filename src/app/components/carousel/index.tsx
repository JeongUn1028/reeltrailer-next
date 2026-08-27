"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ProgramType } from "@/app/types/types";
import Carousel from "./carousel";
import CarouselList from "./carousel-list";
import styles from "./index.module.css";
import constants from "../../../config/ott-provider-ids.json";

//* Header 영역의 선택에 따라 Carousel과 CarouselList가 변경
//* ALL 일 경우 인기 영상
//* 인기영상중 각 OTT별로 제공되는 영상만 필터링하여 CarouselList에 전달

export default function CarouselContainer() {
  const params = useParams();
  const router = useRouter();
  const ott = params?.ott;

  //* 인기 영상 전체
  const [Programs, setPrograms] = useState<ProgramType[]>([]);
  //* 선택된 영상 ID
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const url = new URL(
          `${process.env.NEXT_PUBLIC_API_URL}/getMovies?page=1&limit=20`,
        );
        if (ott) {
          const ottName = ott as keyof typeof constants;
          const providerId = ott ? constants[ottName] : undefined;
          url.searchParams.append("providerId", providerId as string);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          alert("영화정보를 가져오는데 실패했습니다.");
          router.push("/");
          return;
        }
        const data = await response.json();
        setPrograms(
          data.movies.filter(
            (movie: ProgramType | undefined) =>
              movie?.trailerKey !== null && movie?.trailerKey !== undefined,
          ),
        );
        setSelectedVideoId(
          data.movies.find(
            (movie: ProgramType | undefined) =>
              movie?.trailerKey !== null && movie?.trailerKey !== undefined,
          )?.trailerKey || "",
        );
      } catch (error) {
        console.error("Error fetching programs:", error);
        alert("영화정보를 가져오는중 에러가 발생했습니다.");
        router.replace("/");
      }
    };
    fetchPrograms();
  }, [ott, router]);

  return (
    <div className={styles.carouselLayout}>
      <div className={styles.playerPane}>
        <Carousel videoId={selectedVideoId} />
      </div>
      <div className={styles.listPane}>
        <CarouselList
          programs={Programs}
          selectedVideoId={selectedVideoId}
          onSelectVideo={setSelectedVideoId}
        />
      </div>
    </div>
  );
}
