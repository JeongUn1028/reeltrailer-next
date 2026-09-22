import { describe, expect, it } from "vitest";
import { mergeTypedPages } from "../catalog";
import type { ProgramSummary } from "@/app/types/types";

const p = (id: number, mediaType: "movie" | "tvshow", popularity: number): ProgramSummary => ({
  id, mediaType, title: `t${id}`, posterPath: null, backdropPath: null, trailerKey: null,
  releaseDate: null, voteAverage: 0, voteCount: 0, popularity, providers: [], genres: [],
});

describe("mergeTypedPages", () => {
  it("두 유형의 페이지를 인기순으로 합치고, 어느 한쪽이라도 limit+1개를 받았으면 hasMore", () => {
    const movies = [p(1, "movie", 90), p(2, "movie", 50), p(3, "movie", 10)]; // limit 2 + 1
    const tvShows = [p(1, "tvshow", 70)];
    const { items, hasMore } = mergeTypedPages(movies, tvShows, 2);
    expect(items.map((i) => `${i.mediaType}-${i.id}`)).toEqual(["movie-1", "tvshow-1", "movie-2"]);
    expect(hasMore).toBe(true);
  });

  it("둘 다 limit 이하이면 hasMore=false", () => {
    const { items, hasMore } = mergeTypedPages([p(1, "movie", 1)], [p(2, "tvshow", 2)], 5);
    expect(items).toHaveLength(2);
    expect(hasMore).toBe(false);
  });
});
