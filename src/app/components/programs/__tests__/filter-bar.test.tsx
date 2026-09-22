import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FilterBar from "../filter-bar";
import { browseHref } from "@/app/lib/programUrls";

describe("FilterBar", () => {
  it("현재 kind/sort에 aria-current를 표시한다", () => {
    render(
      <FilterBar kind="movie" sort="latest" buildHref={(next) => browseHref({ kind: "movie", sort: "latest", ...next })} />,
    );
    expect(screen.getByRole("link", { name: "영화" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "최신순" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "전체" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "인기순" })).not.toHaveAttribute("aria-current");
  });

  it("각 링크는 다른 조건을 유지한 채 하나만 바꾼다", () => {
    render(
      <FilterBar kind="movie" sort="latest" buildHref={(next) => browseHref({ kind: "movie", sort: "latest", ...next })} />,
    );
    expect(screen.getByRole("link", { name: "TV" })).toHaveAttribute("href", "/browse?kind=tvshow&sort=latest");
    expect(screen.getByRole("link", { name: "평점순" })).toHaveAttribute("href", "/browse?kind=movie&sort=rating");
    expect(screen.getByRole("link", { name: "전체" })).toHaveAttribute("href", "/browse?sort=latest");
  });
});
