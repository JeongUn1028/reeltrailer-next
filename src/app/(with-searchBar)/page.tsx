import CarouselContainer from "../components/carousel";
import styles from "./page.module.css";
import { ErrorBoundary } from "react-error-boundary";
import RecommendSection from "../components/programs/recommendSection";
import { Suspense } from "react";
import CarouselErrorFallback from "../components/carousel/caarouselerrorfallback";
import CarouselSkeleton from "../components/skeleton/carousel-skeleton";

export default function Home() {
  return (
    <div className={styles.container}>
      <ErrorBoundary FallbackComponent={CarouselErrorFallback}>
        <Suspense fallback={<CarouselSkeleton />}>
          <CarouselContainer />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection />
    </div>
  );
}
