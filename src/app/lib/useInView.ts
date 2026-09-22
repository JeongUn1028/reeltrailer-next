"use client";

import { useEffect, useRef, useState } from "react";

type UseInViewOptions = {
  /** 뷰포트 경계 밖 얼마나 앞에서 미리 감지할지 (예: "300px") */
  rootMargin?: string;
  /** 한 번 보이면 관찰을 멈출지 */
  once?: boolean;
  /** false면 관찰하지 않음 */
  enabled?: boolean;
};

//* 요소가 뷰포트에 들어왔는지 알려주는 훅.
//* 초기값은 항상 false라 SSR/hydration 결과가 같다. IntersectionObserver가 없는 환경에서는 계속 false이므로
//* 호출하는 쪽에서 수동 동작(버튼 등)을 함께 제공해야 한다.
export function useInView<T extends Element>({
  rootMargin = "0px",
  once = true,
  enabled = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((e) => e.target === node) ?? entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, once, rootMargin]);

  return { ref, inView };
}
