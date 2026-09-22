import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Program from "../program";

const base = {
  id: 42,
  mediaType: "movie" as const,
  title: "테스트 영화",
  posterPath: "/poster.jpg",
  releaseDate: "2024-03-01",
  voteAverage: 7.84,
};

describe("Program 카드", () => {
  it("상세 링크, 포스터, 제목, 연도, 평점을 렌더링한다", () => {
    render(<Program program={base} />);

    const link = screen.getByRole("link", { name: "테스트 영화 상세 보기" });
    expect(link).toHaveAttribute("href", "/program/42?kind=movie");
    expect(screen.getByRole("img", { name: "테스트 영화 포스터" })).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w342/poster.jpg",
    );
    expect(screen.getByText("테스트 영화")).toBeInTheDocument();
    expect(screen.getByText("영화")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    // 평점은 "★"와 숫자가 별도 span이라 텍스트 콘텐츠로 확인
    expect(screen.getByText("★").parentElement).toHaveTextContent("7.8");
  });

  it("포스터가 없으면 대체 박스를, 평점 0이면 평점을 숨긴다", () => {
    render(
      <Program
        program={{ ...base, mediaType: "tvshow", posterPath: null, voteAverage: 0, releaseDate: null }}
      />,
    );
    expect(screen.getByText("No Image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();
    expect(screen.queryByText("★")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/program/42?kind=tvshow");
  });
});
