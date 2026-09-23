import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import TrailerShowcaseSection from "../components/trailers/trailer-showcase-section";
import RecommendSection from "../components/programs/recommend-section";
import TrailerShowcaseErrorFallback from "../components/trailers/trailer-showcase-error-fallback";
import TrailerShowcaseSkeleton from "../components/trailers/trailer-showcase-skeleton";
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
      <ErrorBoundary FallbackComponent={TrailerShowcaseErrorFallback}>
        <Suspense fallback={<TrailerShowcaseSkeleton />}>
          <TrailerShowcaseSection kind={kind} sort={sort} />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection kind={kind} sort={sort} />
    </div>
  );
}
