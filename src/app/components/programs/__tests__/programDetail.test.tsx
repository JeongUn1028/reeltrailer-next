import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ProgramDetailView } from "../programDetail";
import type { ProgramDetail, ProgramSummary } from "@/app/types/types";

const program: ProgramDetail = {
  id: 1,
  mediaType: "movie",
  title: "기생충",
  originalTitle: "Parasite",
  overview: "줄거리 본문 텍스트",
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

const similarItem = (id: number, title: string): ProgramSummary => ({
  ...(program as ProgramSummary),
  id,
  title,
});

describe("ProgramDetailView", () => {
  it("히어로에 제목·원제·요약 메타, 본문에 줄거리와 상세 정보 표를 표시한다", () => {
    render(<ProgramDetailView program={program} similar={[]} />);
    expect(screen.getByRole("heading", { level: 1, name: "기생충" })).toBeInTheDocument();
    expect(screen.getByText("Parasite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기생충 예고편 재생" })).toBeInTheDocument();
    expect(screen.getByText("줄거리 본문 텍스트")).toBeInTheDocument();

    const info = screen.getByRole("list", { name: "상세 정보" });
    expect(within(info).getByText("공개일").nextElementSibling).toHaveTextContent("2019.05.30");
    expect(within(info).getByText("평가").nextElementSibling).toHaveTextContent("8.5");
    expect(within(info).getByText("평가").nextElementSibling).toHaveTextContent("18,000");
    expect(within(info).getByText("장르").nextElementSibling).toHaveTextContent("드라마 · 스릴러 · 코미디");
    expect(within(info).getByText("유형").nextElementSibling).toHaveTextContent("영화");
  });

  it("시청 가능한 OTT는 중복을 합치고, 지원 OTT는 외부 링크로 만든다", () => {
    render(<ProgramDetailView program={program} similar={[]} />);
    const list = screen.getByRole("list", { name: "시청 가능한 OTT" });
    expect(list.querySelectorAll("li")).toHaveLength(2); // Netflix(병합), Unknown OTT

    const netflix = within(list).getByRole("link", { name: /Netflix/ });
    expect(netflix).toHaveAttribute("href", expect.stringContaining("netflix.com/search?q="));
    expect(netflix).toHaveAttribute("target", "_blank");
    expect(within(list).queryByRole("link", { name: /Unknown OTT/ })).not.toBeInTheDocument();
  });

  it("비슷한 콘텐츠는 그리드로 최대 12개까지 표시한다", () => {
    const similar = Array.from({ length: 15 }, (_, i) => similarItem(100 + i, `작품 ${i}`));
    render(<ProgramDetailView program={program} similar={similar} />);
    const section = screen.getByRole("region", { name: "비슷한 콘텐츠" });
    expect(within(section).getAllByRole("link", { name: /상세 보기/ })).toHaveLength(12);
  });

  it("원제가 제목과 같으면 원제를 숨기고, 줄거리·OTT가 없으면 안내 문구를 보여준다", () => {
    render(
      <ProgramDetailView
        program={{ ...program, originalTitle: "기생충", overview: null, trailerKey: null, providers: [] }}
        similar={[]}
      />,
    );
    expect(screen.getAllByText("기생충")).toHaveLength(1);
    expect(screen.getByText("등록된 줄거리 정보가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("현재 제공 중인 OTT가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /예고편/ })).not.toBeInTheDocument();
  });
});
