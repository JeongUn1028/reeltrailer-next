import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SearchSummary from "../search-summary";

describe("SearchSummary", () => {
  it("총 건수를 표시한다", () => {
    render(<SearchSummary query="오징어" total={12} fuzzy={false} />);
    expect(screen.getByText("12편")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("유사 검색 결과이면 안내 배너를 보여준다", () => {
    render(<SearchSummary query="오징이" total={2} fuzzy />);
    expect(screen.getByRole("status")).toHaveTextContent("“오징이”와 정확히 일치하는 결과가 없어 비슷한 제목을 보여드립니다.");
  });
});
