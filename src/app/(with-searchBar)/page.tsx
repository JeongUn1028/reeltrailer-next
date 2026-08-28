import CarouselContainer from "../components/carousel";
import styles from "./page.module.css";
import RecommendSection from "../components/programs/recommendSection";

export default async function Home() {
  return (
    <div className={styles.container}>
      <CarouselContainer />
      <RecommendSection />
    </div>
  );
}
