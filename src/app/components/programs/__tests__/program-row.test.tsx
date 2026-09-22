import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramRow from "../program-row";
import type { ProgramSummary } from "@/app/types/types";

const program = (id: number, mediaType: "movie" | "tvshow" = "movie"): ProgramSummary => ({
  id,
  mediaType,
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

describe("ProgramRow", () => {
  it("데이터가 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(<ProgramRow title="빈 행" programs={[]} moreHref="/browse" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("제목, 카드 목록, 더 보기 링크를 렌더링한다", () => {
    render(
      <ProgramRow
        title="추천하는 영화"
        programs={[program(1), program(2), program(1, "tvshow")]}
        moreHref="/browse?kind=movie"
      />,
    );
    expect(screen.getByRole("heading", { name: "추천하는 영화" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /더 보기/ })).toHaveAttribute("href", "/browse?kind=movie");
    // 같은 id라도 mediaType이 다르면 별도 카드
    expect(screen.getAllByRole("link", { name: /상세 보기/ })).toHaveLength(3);
  });

  it("moreHref가 없으면 더 보기 링크를 숨긴다", () => {
    render(<ProgramRow title="비슷한 콘텐츠" programs={[program(1)]} />);
    expect(screen.queryByRole("link", { name: /더 보기/ })).not.toBeInTheDocument();
  });
});
