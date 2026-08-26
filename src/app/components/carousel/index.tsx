"use client";

import { useState, useEffect } from "react";
import type { ProgramType } from "@/app/types/types";
import Carousel from "./carousel";
import CarouselList from "./carousel-list";
import styles from "./index.module.css";

//* Header 영역의 선택에 따라 Carousel과 CarouselList가 변경
//* ALL 일 경우 인기 영상
//* 각 카테고리시 카테고리의 영상

export default function CarouselContainer() {
  //* 인기 영상 전체
  const [popularPrograms, setPopularPrograms] = useState<ProgramType[]>([]);
  //* 선택된 영상 ID
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  useEffect(() => {
    const popularPrograms = async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/getMovie?page=1&limit=20`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch popular programs");
      }
      const data = await response.json();
      console.log(data.movies);
      setPopularPrograms(
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
    };
    popularPrograms();
  }, []);

  return (
    <div className={styles.carouselLayout}>
      <div className={styles.playerPane}>
        <Carousel videoId={selectedVideoId} />
      </div>
      <div className={styles.listPane}>
        <CarouselList
          programs={popularPrograms}
          selectedVideoId={selectedVideoId}
          onSelectVideo={setSelectedVideoId}
        />
      </div>
    </div>
  );
}
