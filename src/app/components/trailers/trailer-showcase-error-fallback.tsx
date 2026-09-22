"use client";

import type { FallbackProps } from "react-error-boundary";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import ErrorState from "../error/error-state";

export default function TrailerShowcaseErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const { reset } = useQueryErrorResetBoundary();
  console.error("[TrailerShowcase]", error);

  return (
    <ErrorState
      variant="inline"
      eyebrow="TRAILERS"
      title="예고편을 불러오지 못했습니다"
      description="영화 정보를 가져오는 중 문제가 발생했습니다."
      onRetry={() => {
        // useSuspenseQuery의 에러 상태를 초기화한 뒤 바운더리를 리셋해야 재요청됨
        reset();
        resetErrorBoundary();
      }}
      showHomeLink={false}
    />
  );
}
