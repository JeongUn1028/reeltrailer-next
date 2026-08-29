import styles from "../page.module.css";
import CarouselContainer from "../../components/carousel";
import RecommendSection from "../../components/programs/recommendSection";
import { Suspense, use } from "react";
import CarouselSkeleton from "../../components/skeleton/carousel-skeleton";
import CarouselErrorFallback from "../../components/carousel/caarouselerrorfallback";
import providerIds from "@/config/ott-provider-ids.json";
import { notFound } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

export default function Home({ params }: { params: Promise<{ ott: string }> }) {
  const { ott } = use(params);
  const providerId = providerIds[ott as keyof typeof providerIds];

  if (!providerId) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <ErrorBoundary FallbackComponent={CarouselErrorFallback}>
        <Suspense fallback={<CarouselSkeleton />}>
          <CarouselContainer />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection providerId={providerId} />
    </div>
  );
}
