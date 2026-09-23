import { describe, expect, it } from "vitest";
import { isProgramKindFilter, isProgramMediaType, isProgramSortKey } from "../types";

describe("isProgramMediaType", () => {
  it("movie와 tvshow만 통과시킨다", () => {
    expect(isProgramMediaType("movie")).toBe(true);
    expect(isProgramMediaType("tvshow")).toBe(true);
  });

  it("그 밖의 값이면 false를 돌려준다", () => {
    // 목록 필터의 "all"은 상세 URL의 kind로 쓸 수 없다
    expect(isProgramMediaType("all")).toBe(false);
    expect(isProgramMediaType("MOVIE")).toBe(false);
    expect(isProgramMediaType(undefined)).toBe(false);
    expect(isProgramMediaType(null)).toBe(false);
    expect(isProgramMediaType(1)).toBe(false);
  });
});

describe("isProgramKindFilter", () => {
  it("all, movie, tvshow를 통과시키고 나머지는 거른다", () => {
    expect(isProgramKindFilter("all")).toBe(true);
    expect(isProgramKindFilter("movie")).toBe(true);
    expect(isProgramKindFilter("tvshow")).toBe(true);
    expect(isProgramKindFilter("anime")).toBe(false);
    expect(isProgramKindFilter(undefined)).toBe(false);
  });
});

describe("isProgramSortKey", () => {
  it("popular, latest, rating을 통과시키고 나머지는 거른다", () => {
    expect(isProgramSortKey("popular")).toBe(true);
    expect(isProgramSortKey("latest")).toBe(true);
    expect(isProgramSortKey("rating")).toBe(true);
    expect(isProgramSortKey("relevance")).toBe(false);
    expect(isProgramSortKey(undefined)).toBe(false);
  });
});
