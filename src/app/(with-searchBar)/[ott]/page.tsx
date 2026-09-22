import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { notFound } from "next/navigation";
import CarouselContainer from "../../components/carousel";
import RecommendSection from "../../components/programs/recommendSection";
import CarouselErrorFallback from "../../components/carousel/carousel-error-fallback";
import CarouselSkeleton from "../../components/skeleton/carousel-skeleton";
import { ottSlugToProviderId } from "@/app/lib/programUrls";
import { parseListSearchParams, type ListSearchParams } from "@/app/lib/listParams";
import styles from "../page.module.css";

export default async function OttHome({
  params,
  searchParams,
}: {
  params: Promise<{ ott: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const { ott } = await params;
  const providerId = ottSlugToProviderId(ott);
  if (!providerId) {
    notFound();
  }

  const { kind, sort } = parseListSearchParams(await searchParams);

  return (
    <div className={styles.container}>
      <ErrorBoundary FallbackComponent={CarouselErrorFallback}>
        <Suspense fallback={<CarouselSkeleton />}>
          <CarouselContainer />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection ott={ott} providerId={providerId} kind={kind} sort={sort} />
    </div>
  );
}
