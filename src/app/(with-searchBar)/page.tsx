import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import CarouselContainer from "../components/carousel";
import RecommendSection from "../components/programs/recommendSection";
import CarouselErrorFallback from "../components/carousel/carousel-error-fallback";
import CarouselSkeleton from "../components/skeleton/carousel-skeleton";
import { parseListSearchParams, type ListSearchParams } from "@/app/lib/listParams";
import styles from "./page.module.css";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const { kind, sort } = parseListSearchParams(await searchParams);

  return (
    <div className={styles.container}>
      <ErrorBoundary FallbackComponent={CarouselErrorFallback}>
        <Suspense fallback={<CarouselSkeleton />}>
          <CarouselContainer />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection kind={kind} sort={sort} />
    </div>
  );
}
