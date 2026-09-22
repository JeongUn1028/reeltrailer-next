import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => "/",
}));

import SearchBar from "../searchBar";

const suggestions = [
  { id: 1, mediaType: "tvshow", title: "오징어 게임", posterPath: null, releaseDate: "2021-09-17", providers: [{ id: 8, providerName: "Netflix", logoPath: null }] },
  { id: 2, mediaType: "tvshow", title: "오징어 게임 이야기", posterPath: null, releaseDate: "2024-01-01", providers: [] },
];

function renderBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SearchBar />
    </QueryClientProvider>,
  );
}

describe("SearchBar 자동완성", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockClear();
    window.localStorage.clear();
  });

  it("1글자부터 자동완성을 요청하고 option 역할로 렌더링하며 일치 글자를 강조한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => suggestions });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderBar();

    await user.type(screen.getByRole("combobox"), "오");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(fetchMock.mock.calls[0][0]).toContain("/api/search/suggest?q=%EC%98%A4");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")[0].querySelector("mark")?.textContent).toBe("오");
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("↑↓로 항목을 옮기고 Enter로 선택 항목의 상세로 이동한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => suggestions }));
    const user = userEvent.setup();
    renderBar();

    const input = screen.getByRole("combobox");
    await user.type(input, "오징");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0].id);
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/program/2?kind=tvshow");
  });

  it("선택 항목이 없을 때 Enter는 검색 페이지로 이동하고 최근 검색어에 저장한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByRole("combobox"), "기생충{Enter}");
    expect(push).toHaveBeenCalledWith("/search?q=%EA%B8%B0%EC%83%9D%EC%B6%A9");
    expect(JSON.parse(window.localStorage.getItem("reeltrailer:recent-searches")!)).toEqual(["기생충"]);
  });

  it("입력 중에도 검색어로 시작하는 최근 검색어를 함께 보여준다", async () => {
    window.localStorage.setItem("reeltrailer:recent-searches", JSON.stringify(["오징어 게임", "기생충"]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByRole("combobox"), "오");
    await waitFor(() => expect(screen.getByText("최근 검색어")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: /오징어 게임/ })).toBeInTheDocument();
    expect(screen.queryByText("기생충")).not.toBeInTheDocument();
  });

  it("자동완성 요청이 실패하면 안내 문구를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByRole("combobox"), "오징");
    await waitFor(() => expect(screen.getByText(/자동완성을 불러오지 못했습니다/)).toBeInTheDocument());
  });
});
