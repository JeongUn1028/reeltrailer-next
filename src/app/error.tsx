"use client";

import { useEffect } from "react";
import ErrorState from "./components/error/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <ErrorState
      title="문제가 발생했습니다"
      description="페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      digest={error.digest}
      onRetry={reset}
    />
  );
}
