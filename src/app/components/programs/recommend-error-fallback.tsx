"use client";

import type { FallbackProps } from "react-error-boundary";
import ErrorState from "../error/error-state";

export default function RecommendErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  console.error("[RecommendSection]", error);

  return (
    <ErrorState
      variant="inline"
      eyebrow="RECOMMENDATIONS"
      title="추천 목록을 불러오지 못했습니다"
      description="잠시 후 다시 시도해 주세요."
      onRetry={resetErrorBoundary}
      showHomeLink={false}
    />
  );
}
