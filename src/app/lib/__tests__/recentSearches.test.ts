import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../recentSearches";

describe("recentSearches (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("처음에는 비어 있다", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("최신 검색어가 앞에 오고 중복은 제거된다", () => {
    addRecentSearch("기생충");
    addRecentSearch("오징어 게임");
    addRecentSearch("기생충");
    expect(getRecentSearches()).toEqual(["기생충", "오징어 게임"]);
  });

  it("공백만 있는 검색어는 무시한다", () => {
    addRecentSearch("   ");
    expect(getRecentSearches()).toEqual([]);
  });

  it("최대 8개까지만 유지한다", () => {
    for (let i = 1; i <= 10; i++) addRecentSearch(`q${i}`);
    const items = getRecentSearches();
    expect(items).toHaveLength(8);
    expect(items[0]).toBe("q10");
    expect(items).not.toContain("q1");
  });

  it("개별 삭제와 전체 삭제", () => {
    addRecentSearch("a");
    addRecentSearch("b");
    expect(removeRecentSearch("a")).toEqual(["b"]);
    expect(clearRecentSearches()).toEqual([]);
    expect(getRecentSearches()).toEqual([]);
  });

  it("저장된 값이 손상되어도 빈 배열을 반환한다", () => {
    window.localStorage.setItem("reeltrailer:recent-searches", "{not json");
    expect(getRecentSearches()).toEqual([]);
  });
});
