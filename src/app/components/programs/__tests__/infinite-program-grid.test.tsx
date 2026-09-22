import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InfiniteProgramGrid from "../infinite-program-grid";
import { installIntersectionObserverMock } from "@/app/lib/__tests__/intersection-observer-mock";
import type { ProgramSummary } from "@/app/types/types";

const program = (id: number): ProgramSummary => ({
  id,
  mediaType: "movie",
  title: `작품 ${id}`,
  posterPath: null,
  backdropPath: null,
  trailerKey: null,
  releaseDate: null,
  voteAverage: 0,
  voteCount: 0,
  popularity: 0,
  providers: [],
  genres: [],
});

function renderGrid(initial: { items: ProgramSummary[]; page: number; hasMore: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InfiniteProgramGrid endpoint="/api/browse?kind=movie" initialPage={initial} />
    </QueryClientProvider>,
  );
}

describe("InfiniteProgramGrid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("초기 페이지를 서버 데이터로 렌더링하고, sentinel이 보이면 다음 페이지를 이어 붙인다", async () => {
    const io = installIntersectionObserverMock();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [program(3), program(4)], page: 2, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderGrid({ items: [program(1), program(2)], page: 1, hasMore: true });

    expect(screen.getAllByRole("link", { name: /상세 보기/ })).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => io.intersectAll());

    await waitFor(() => expect(screen.getAllByRole("link", { name: /상세 보기/ })).toHaveLength(4));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/browse?kind=movie&page=2");
    expect(screen.getByText(/모두 불러왔습니다/)).toBeInTheDocument();
  });

  it("hasMore가 false면 sentinel을 관찰하지 않고 fetch도 하지 않는다", () => {
    const io = installIntersectionObserverMock();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderGrid({ items: [program(1)], page: 1, hasMore: false });

    expect(io.observedCount).toBe(0);
    act(() => io.intersectAll());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("빈 결과면 안내 문구를 보여준다", () => {
    installIntersectionObserverMock();
    renderGrid({ items: [], page: 1, hasMore: false });
    expect(screen.getByText("조건에 맞는 콘텐츠가 없습니다.")).toBeInTheDocument();
  });

  it("다음 페이지 요청이 실패하면 다시 시도 버튼을 보여준다", async () => {
    const io = installIntersectionObserverMock();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderGrid({ items: [program(1)], page: 1, hasMore: true });
    act(() => io.intersectAll());

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
