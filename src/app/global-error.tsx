"use client";

import { useEffect } from "react";
import ErrorState from "./components/error/error-state";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <ErrorState
          title="서비스에 문제가 발생했습니다"
          description="예기치 않은 오류로 화면을 표시할 수 없습니다. 새로고침하거나 잠시 후 다시 접속해 주세요."
          digest={error.digest}
          onRetry={reset}
          showHomeLink={false}
        />
      </body>
    </html>
  );
}
