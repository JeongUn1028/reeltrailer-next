import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import genres from "../../../config/genre.json";
import Programs from "./index";
import ProgramsSkeleton from "../skeleton/programs-skeleton";
import RecommendErrorFallback from "./recommend-error-fallback";

export default function RecommendSection({
  providerId,
}: {
  providerId?: string;
}) {
  const recommendedName = [
    "영화",
    "프로그램",
    ...genres.map((genre) => genre.name),
  ];
  return (
    <ErrorBoundary FallbackComponent={RecommendErrorFallback}>
      <Suspense fallback={<ProgramsSkeleton />}>
        {recommendedName.map((name) => (
          <Programs key={name} title={name} providerId={providerId} />
        ))}
      </Suspense>
    </ErrorBoundary>
  );
}
