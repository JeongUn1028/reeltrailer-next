import { describe, expect, it } from "vitest";
import { buildOrderBy, buildWhere, RATING_MIN_VOTE_COUNT } from "../program-query";

describe("buildWhere", () => {
  it("조건이 없으면 빈 where", () => {
    expect(buildWhere({})).toEqual({});
  });

  it("providerId와 genreId를 관계 필터로 변환한다", () => {
    expect(buildWhere({ providerId: 8, genreId: 18 })).toEqual({
      providers: { some: { providerId: 8 } },
      genres: { some: { genreId: 18 } },
    });
  });

  it("평점순은 최소 투표 수 조건을 추가한다", () => {
    expect(buildWhere({ sort: "rating" })).toEqual({
      voteCount: { gte: RATING_MIN_VOTE_COUNT },
    });
  });
});

describe("buildOrderBy", () => {
  it("인기순 / 최신순(날짜 없는 항목은 뒤로) / 평점순", () => {
    expect(buildOrderBy("popular", "releaseDate")).toEqual([{ popularity: "desc" }]);
    expect(buildOrderBy("latest", "firstAirDate")).toEqual([
      { firstAirDate: { sort: "desc", nulls: "last" } },
      { popularity: "desc" },
    ]);
    expect(buildOrderBy("rating", "releaseDate")).toEqual([
      { voteAverage: "desc" },
      { voteCount: "desc" },
    ]);
  });
});
