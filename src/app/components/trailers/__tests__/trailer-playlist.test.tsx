import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrailerPlaylist from "../trailer-playlist";
import type { ProgramSummary } from "@/app/types/types";

const program = (id: number, trailerKey: string, providers: string[]): ProgramSummary => ({
  id,
  mediaType: "movie",
  title: `작품 ${id}`,
  posterPath: null,
  backdropPath: null,
  trailerKey,
  releaseDate: "2021-05-05",
  voteAverage: 0,
  voteCount: 0,
  popularity: 0,
  genres: [],
  providers: providers.map((name, i) => ({ id: i, providerName: name, logoPath: null })),
});

describe("TrailerPlaylist", () => {
  const programs = [
    program(1, "aaa", ["Netflix", "Netflix Standard with Ads"]),
    program(2, "bbb", ["TVING"]),
    program(3, "ccc", []),
  ];

  it("한글 제목/개수, 16:9 썸네일(mqdefault), 정규화된 OTT, 연도를 렌더링한다", () => {
    render(<TrailerPlaylist programs={programs} selectedIndex={1} onSelect={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "예고편 목록" })).toBeInTheDocument();
    expect(screen.getByText("3편")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "작품 1 예고편 썸네일" })).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/aaa/mqdefault.jpg",
    );
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.queryByText(/Standard with Ads/)).not.toBeInTheDocument();
    expect(screen.getAllByText("2021")).toHaveLength(3);
  });

  it("listbox/option 역할과 aria-selected로 선택 상태를 표시한다", () => {
    render(<TrailerPlaylist programs={programs} selectedIndex={1} onSelect={vi.fn()} />);
    expect(screen.getByRole("listbox", { name: "예고편 목록" })).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("클릭하면 인덱스로 onSelect를 호출한다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TrailerPlaylist programs={programs} selectedIndex={0} onSelect={onSelect} />);
    await user.click(screen.getByRole("option", { name: /작품 2/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
