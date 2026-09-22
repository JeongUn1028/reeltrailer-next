import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgramDetailView } from "../programDetail";
import type { ProgramDetail, ProgramSummary } from "@/app/types/types";

const program: ProgramDetail = {
  id: 1,
  mediaType: "movie",
  title: "기생충",
  originalTitle: "Parasite",
  overview: "줄거리",
  posterPath: "/p.jpg",
  backdropPath: "/b.jpg",
  trailerKey: "trailer1",
  releaseDate: "2019-05-30",
  voteAverage: 8.5,
  voteCount: 18000,
  popularity: 100,
  providers: [
    { id: 8, providerName: "Netflix", logoPath: null },
    { id: 1796, providerName: "Netflix Standard with Ads", logoPath: null },
    { id: 999, providerName: "Unknown OTT", logoPath: null },
  ],
  genres: [
    { id: 18, name: "드라마" },
    { id: 53, name: "스릴러" },
    { id: 35, name: "코미디" },
  ],
};

describe("ProgramDetailView", () => {
  it("제목, 원제, 평점, 연도, 장르, 줄거리를 표시한다", () => {
    render(<ProgramDetailView program={program} similar={[]} />);
    expect(screen.getByRole("heading", { level: 1, name: "기생충" })).toBeInTheDocument();
    expect(screen.getByText("Parasite")).toBeInTheDocument();
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("(18,000)")).toBeInTheDocument();
    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.getByText("드라마 · 스릴러 · 코미디")).toBeInTheDocument();
    expect(screen.getByText("줄거리")).toBeInTheDocument();
  });

  it("OTT 목록은 중복을 합치고, 지원 OTT는 외부 링크로 만든다", () => {
    render(<ProgramDetailView program={program} similar={[]} />);
    const list = screen.getByRole("list", { name: "시청 가능한 OTT" });
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(2); // Netflix(병합), Unknown OTT

    const netflix = screen.getByRole("link", { name: /Netflix/ });
    expect(netflix).toHaveAttribute("href", expect.stringContaining("netflix.com/search?q="));
    expect(netflix).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("link", { name: /Unknown OTT/ })).not.toBeInTheDocument();
    expect(screen.getByText("Netflix · Unknown OTT")).toBeInTheDocument();
  });

  it("예고편이 있으면 재생 버튼을, 비슷한 콘텐츠가 있으면 행을 표시한다", () => {
    render(
      <ProgramDetailView
        program={program}
        similar={[{ ...(program as ProgramSummary), id: 2, title: "옥자" }]}
      />,
    );
    expect(screen.getByRole("button", { name: "기생충 예고편 재생" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "비슷한 콘텐츠" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "옥자 상세 보기" })).toBeInTheDocument();
  });

  it("원제가 제목과 같으면 원제를 숨기고, 줄거리가 없으면 안내 문구", () => {
    render(
      <ProgramDetailView
        program={{ ...program, originalTitle: "기생충", overview: null, trailerKey: null }}
        similar={[]}
      />,
    );
    expect(screen.getAllByText("기생충")).toHaveLength(1);
    expect(screen.getByText("등록된 줄거리 정보가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /예고편/ })).not.toBeInTheDocument();
  });
});
