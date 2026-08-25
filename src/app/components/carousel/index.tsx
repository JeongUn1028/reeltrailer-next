"use client";

import { useState } from "react";
import Carousel from "./carousel";
import CarouselList from "./carousel-list";
import styles from "./index.module.css";

const playList = ["nZDAsy3a77A", "JAdN7aG2JGg"];

//* Header 영역의 선택에 따라 Carousel과 CarouselList가 변경
//* ALL 일 경우 인기 영상
//* 각 카테고리시 카테고리의 영상

export default function CarouselContainer() {
  const [selectedVideoId, setSelectedVideoId] = useState(playList[0]);

  return (
    <div className={styles.carouselLayout}>
      <div className={styles.playerPane}>
        <Carousel videoId={selectedVideoId} />
      </div>
      <div className={styles.listPane}>
        <CarouselList
          playList={playList}
          selectedVideoId={selectedVideoId}
          onSelectVideo={setSelectedVideoId}
        />
      </div>
    </div>
  );
}
