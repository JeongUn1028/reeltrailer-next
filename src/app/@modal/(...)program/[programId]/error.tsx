"use client";

import { useEffect } from "react";
import Modal from "@/app/components/modal/modal";
import ErrorState from "@/app/components/error/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Program Modal Error]", error);
  }, [error]);

  return (
    <Modal>
      <ErrorState
        title="콘텐츠 정보를 불러오지 못했습니다"
        description="상세 정보를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        digest={error.digest}
        onRetry={reset}
      />
    </Modal>
  );
}
