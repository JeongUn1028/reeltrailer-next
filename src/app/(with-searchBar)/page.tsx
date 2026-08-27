import CarouselContainer from "../components/carousel";
import styles from "./page.module.css";
import RecommendSection from "../components/programs/recommendSection";

//TODO: Add OTT Programs
//TODO: Add All genres
//* 추천하는 00 이 영역을 분리 하고,

export default async function Home() {
  return (
    <div className={styles.container}>
      <CarouselContainer />
      <RecommendSection />
    </div>
  );
}
