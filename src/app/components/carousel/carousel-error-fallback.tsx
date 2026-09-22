"use client";

import type { FallbackProps } from "react-error-boundary";

export default function CarouselErrorFallback({ error }: FallbackProps) {
  console.error(error);

  return (
    <section aria-live="polite">
      영화 정보를 가져오는 중 문제가 발생했습니다.
    </section>
  );
}
