import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import TrailerShowcase from "../trailer-showcase";

const movies = [
  { id: 1, mediaType: "movie", title: "첫 번째", trailerKey: "key1", providers: [] },
  { id: 2, mediaType: "movie", title: "예고편 없음", trailerKey: null, providers: [] },
  { id: 3, mediaType: "movie", title: "세 번째", trailerKey: "key3", providers: [] },
];

function renderShowcase() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>loading</p>}>
        <TrailerShowcase />
      </Suspense>
    </QueryClientProvider>,
  );
}

describe("TrailerShowcase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("영화 목록을 불러와 예고편이 있는 항목만 목록에 보여주고 첫 영상을 재생한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ movies }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderShowcase();
    await waitFor(() => expect(screen.getByText("2 videos")).toBeInTheDocument());

    expect(fetchMock.mock.calls[0][0]).toContain("/getMoviesList?page=1&limit=20");
    expect(screen.queryByText("예고편 없음")).not.toBeInTheDocument();
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain("/embed/key1");
  });

  it("목록에서 다른 영상을 고르면 플레이어가 바뀐다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ movies }) }),
    );
    const user = userEvent.setup();

    renderShowcase();
    await waitFor(() => expect(screen.getByText("2 videos")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /세 번째/ }));

    expect(document.querySelector("iframe")?.getAttribute("src")).toContain("/embed/key3");
  });
});
