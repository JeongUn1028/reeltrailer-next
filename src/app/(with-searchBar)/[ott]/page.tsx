import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { notFound } from "next/navigation";
import TrailerShowcase from "../../components/trailers/trailer-showcase";
import RecommendSection from "../../components/programs/recommendSection";
import TrailerShowcaseErrorFallback from "../../components/trailers/trailer-showcase-error-fallback";
import TrailerShowcaseSkeleton from "../../components/skeleton/trailer-showcase-skeleton";
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
      <ErrorBoundary FallbackComponent={TrailerShowcaseErrorFallback}>
        <Suspense fallback={<TrailerShowcaseSkeleton />}>
          <TrailerShowcase />
        </Suspense>
      </ErrorBoundary>
      <RecommendSection ott={ott} providerId={providerId} kind={kind} sort={sort} />
    </div>
  );
}
