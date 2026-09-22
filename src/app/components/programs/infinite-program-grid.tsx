"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ProgramSummary } from "@/app/types/types";
import { useInView } from "@/app/lib/useInView";
import Program from "./program";
import styles from "./infinite-program-grid.module.css";

export interface ProgramPage {
  items: ProgramSummary[];
  page: number;
  hasMore: boolean;
}

type InfiniteProgramGridProps = {
  /** page 파라미터를 제외한 API URL (예: "/api/browse?kind=movie") */
  endpoint: string;
  /** 서버에서 미리 렌더링한 첫 페이지 */
  initialPage: ProgramPage;
  emptyText?: string;
};

async function fetchPage(endpoint: string, page: number): Promise<ProgramPage> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const response = await fetch(`${endpoint}${separator}page=${page}`);
  if (!response.ok) {
    throw new Error(`목록을 불러오지 못했습니다 (${response.status})`);
  }
  return (await response.json()) as ProgramPage;
}

//* 무한 스크롤 카드 그리드. 첫 페이지는 SSR 결과를 그대로 쓰고, 하단 sentinel이 보이면 다음 페이지를 이어 붙인다.
export default function InfiniteProgramGrid({
  endpoint,
  initialPage,
  emptyText = "조건에 맞는 콘텐츠가 없습니다.",
}: InfiniteProgramGridProps) {
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    isError,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["program-grid", endpoint, initialPage.page],
    queryFn: ({ pageParam }) => fetchPage(endpoint, pageParam),
    initialPageParam: initialPage.page,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    initialData: { pages: [initialPage], pageParams: [initialPage.page] },
    staleTime: 1000 * 60 * 5,
  });

  const { ref: sentinelRef, inView } = useInView<HTMLDivElement>({
    rootMargin: "600px 0px",
    once: false,
    enabled: Boolean(hasNextPage) && !isError,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const items = data.pages.flatMap((page) => page.items);

  if (items.length === 0) {
    return <div className={styles.empty}>{emptyText}</div>;
  }

  return (
    <>
      <div className={styles.grid}>
        {items.map((program, index) => (
          <Program
            key={`${program.mediaType}-${program.id}`}
            program={program}
            priority={index < 6}
          />
        ))}
        {isFetchingNextPage &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={`skeleton-${i}`} className={styles.skeleton} aria-hidden="true" />
          ))}
      </div>

      <div className={styles.footer}>
        {isError ? (
          <>
            <p className={styles.note}>다음 페이지를 불러오지 못했습니다.</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => (data.pages.length > 0 ? fetchNextPage() : refetch())}
            >
              다시 시도
            </button>
          </>
        ) : hasNextPage ? (
          // JS는 있지만 IntersectionObserver가 없는 환경을 위한 수동 버튼
          <div ref={sentinelRef} className={styles.sentinel}>
            <button
              type="button"
              className={styles.button}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "불러오는 중..." : "더 불러오기"}
            </button>
          </div>
        ) : (
          <p className={styles.note}>모두 불러왔습니다 · {items.length}편</p>
        )}
      </div>
    </>
  );
}
