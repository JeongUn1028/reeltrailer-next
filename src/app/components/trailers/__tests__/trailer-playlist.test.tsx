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
  releaseDate: null,
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
    program(3, "aaa", []), // 같은 예고편 키를 공유해도 별도 항목
  ];

  it("영상 개수, 썸네일, 제목, 정규화된 OTT를 렌더링한다", () => {
    render(<TrailerPlaylist programs={programs} selectedVideoId="bbb" onSelectVideo={vi.fn()} />);

    expect(screen.getByText("3 videos")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Trailer 작품 1" })).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/aaa/hqdefault.jpg",
    );
    // Netflix / Netflix Standard with Ads → "Netflix" 하나로 병합
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.queryByText(/Standard with Ads/)).not.toBeInTheDocument();
  });

  it("선택된 영상만 aria-pressed=true", () => {
    render(<TrailerPlaylist programs={programs} selectedVideoId="bbb" onSelectVideo={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("클릭하면 해당 예고편 키로 onSelectVideo를 호출한다", async () => {
    const user = userEvent.setup();
    const onSelectVideo = vi.fn();
    render(<TrailerPlaylist programs={programs} selectedVideoId="" onSelectVideo={onSelectVideo} />);

    await user.click(screen.getByRole("button", { name: /작품 2/ }));
    expect(onSelectVideo).toHaveBeenCalledWith("bbb");
  });
});
