import { describe, expect, it } from "vitest";
import { parseListSearchParams } from "../listParams";

describe("parseListSearchParams", () => {
  it("빈 입력은 기본값", () => {
    expect(parseListSearchParams({})).toEqual({
      kind: "all",
      sort: "popular",
      page: 1,
      genreId: undefined,
      ott: undefined,
    });
  });

  it("유효한 값은 그대로 사용", () => {
    expect(
      parseListSearchParams({ kind: "tvshow", sort: "rating", page: "4", genre: "18", ott: "wavve" }),
    ).toEqual({ kind: "tvshow", sort: "rating", page: 4, genreId: 18, ott: "wavve" });
  });

  it("잘못된 값은 기본값으로 대체", () => {
    expect(parseListSearchParams({ kind: "anime", sort: "asc", page: "-1", genre: "abc" })).toEqual({
      kind: "all",
      sort: "popular",
      page: 1,
      genreId: undefined,
      ott: undefined,
    });
    expect(parseListSearchParams({ page: "2.5" }).page).toBe(1);
    expect(parseListSearchParams({ page: "0" }).page).toBe(1);
  });
});
