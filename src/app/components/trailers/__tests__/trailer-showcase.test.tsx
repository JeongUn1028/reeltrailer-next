import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProgramSummary } from "@/app/types/types";

// YouTube IFrame API mock: Player 생성/loadVideoById/onStateChange를 관찰한다
const players: FakePlayer[] = [];
class FakePlayer {
  options: { videoId: string; events?: { onStateChange?: (e: { data: number }) => void } };
  loadVideoById = vi.fn();
  destroy = vi.fn();
  constructor(_el: HTMLElement, options: FakePlayer["options"]) {
    this.options = options;
    players.push(this);
  }
  end() {
    this.options.events?.onStateChange?.({ data: 0 });
  }
}
vi.mock("../youtube-player", () => ({
  loadYouTubeApi: () => Promise.resolve({ Player: FakePlayer, PlayerState: { ENDED: 0 } }),
}));

import TrailerShowcase from "../trailer-showcase";

const program = (id: number, key: string, title: string): ProgramSummary => ({
  id,
  mediaType: id % 2 ? "movie" : "tvshow",
  title,
  posterPath: null,
  backdropPath: null,
  trailerKey: key,
  releaseDate: "2024-01-01",
  voteAverage: 7,
  voteCount: 100,
  popularity: 10,
  providers: [{ id: 8, providerName: "Netflix", logoPath: null }],
  genres: [],
});
const programs = [program(1, "k1", "첫 번째"), program(2, "k2", "두 번째"), program(3, "k3", "세 번째")];

describe("TrailerShowcase", () => {
  beforeEach(() => {
    players.length = 0;
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("초기에는 iframe/플레이어 없이 썸네일과 재생 버튼, 캡션(제목·상세 링크)만 보여준다", () => {
    render(<TrailerShowcase programs={programs} />);
    expect(players).toHaveLength(0);
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "첫 번째 예고편 재생" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "첫 번째" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /상세 보기/ })).toHaveAttribute("href", "/program/1?kind=movie");
    // 썸네일은 maxresdefault
    expect(document.querySelector("img[src*='k1/maxresdefault']")).not.toBeNull();
  });

  it("재생 버튼을 누르면 YouTube 플레이어가 생성되고, 다른 항목을 고르면 loadVideoById로 전환된다", async () => {
    const user = userEvent.setup();
    render(<TrailerShowcase programs={programs} />);
    await user.click(screen.getByRole("button", { name: "첫 번째 예고편 재생" }));
    await waitFor(() => expect(players).toHaveLength(1));
    expect(players[0].options.videoId).toBe("k1");

    await user.click(screen.getByRole("option", { name: /세 번째/ }));
    expect(players[0].loadVideoById).toHaveBeenCalledWith("k3");
    expect(screen.getByRole("heading", { name: "세 번째" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /세 번째/ })).toHaveAttribute("aria-selected", "true");
  });

  it("재생 전 목록을 고르면 썸네일만 바뀌고 플레이어는 만들지 않는다", async () => {
    const user = userEvent.setup();
    render(<TrailerShowcase programs={programs} />);
    await user.click(screen.getByRole("option", { name: /두 번째/ }));
    expect(players).toHaveLength(0);
    expect(screen.getByRole("button", { name: "두 번째 예고편 재생" })).toBeInTheDocument();
    expect(document.querySelector("img[src*='k2/maxresdefault']")).not.toBeNull();
  });

  it("영상이 끝나면 다음 예고편으로 넘어가고, 마지막이면 처음으로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<TrailerShowcase programs={programs} />);
    await user.click(screen.getByRole("button", { name: /예고편 재생/ }));
    await waitFor(() => expect(players).toHaveLength(1));

    act(() => players[0].end());
    expect(players[0].loadVideoById).toHaveBeenLastCalledWith("k2");
    act(() => players[0].end());
    expect(players[0].loadVideoById).toHaveBeenLastCalledWith("k3");
    act(() => players[0].end());
    expect(players[0].loadVideoById).toHaveBeenLastCalledWith("k1");
    expect(screen.getByRole("heading", { name: "첫 번째" })).toBeInTheDocument();
  });

  it("목록에서 ↑↓ 키로 선택을 옮기고 활성 항목을 스크롤로 보여준다", async () => {
    const user = userEvent.setup();
    render(<TrailerShowcase programs={programs} />);
    const list = screen.getByRole("listbox");
    list.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /두 번째/ })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("option", { name: /첫 번째/ })).toHaveAttribute("aria-selected", "true"); // 순환
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /세 번째/ })).toHaveAttribute("aria-selected", "true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("예고편이 하나도 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(<TrailerShowcase programs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
