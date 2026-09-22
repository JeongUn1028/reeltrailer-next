import { describe, expect, it } from "vitest";
import type { ProgramSummary } from "@/app/types/types";
import {
  getAvailableGenres,
  getRecentReleases,
  queryCatalog,
  sortPrograms,
  type Catalog,
} from "../catalog";

const program = (
  overrides: Partial<ProgramSummary> & Pick<ProgramSummary, "id" | "mediaType">,
): ProgramSummary => ({
  title: `title-${overrides.id}`,
  posterPath: null,
  backdropPath: null,
  trailerKey: null,
  releaseDate: null,
  voteAverage: 0,
  voteCount: 0,
  popularity: 0,
  providers: [],
  genres: [],
  ...overrides,
});

const netflix = { id: 8, providerName: "Netflix", logoPath: null };
const tving = { id: 1883, providerName: "TVING", logoPath: null };
const action = { id: 28, name: "액션" };
const drama = { id: 18, name: "드라마" };

const catalog: Catalog = {
  movies: [
    program({ id: 1, mediaType: "movie", popularity: 90, voteAverage: 8.5, voteCount: 1000, releaseDate: "2026-09-10", providers: [netflix], genres: [action] }),
    program({ id: 2, mediaType: "movie", popularity: 50, voteAverage: 9.8, voteCount: 3, releaseDate: "2026-01-01", providers: [tving], genres: [drama] }),
    program({ id: 3, mediaType: "movie", popularity: 70, voteAverage: 7.0, voteCount: 200, releaseDate: null, providers: [netflix, tving], genres: [action, drama] }),
  ],
  tvShows: [
    program({ id: 1, mediaType: "tvshow", popularity: 95, voteAverage: 8.0, voteCount: 400, releaseDate: "2026-09-15", providers: [netflix], genres: [drama] }),
    program({ id: 4, mediaType: "tvshow", popularity: 10, voteAverage: 6.0, voteCount: 60, releaseDate: "2020-05-05", providers: [tving], genres: [] }),
  ],
};

describe("sortPrograms", () => {
  it("popular: 인기순 내림차순", () => {
    const ids = sortPrograms(catalog.movies, "popular").map((p) => p.id);
    expect(ids).toEqual([1, 3, 2]);
  });

  it("latest: 공개일 내림차순, 날짜 없는 항목은 마지막", () => {
    const ids = sortPrograms(catalog.movies, "latest").map((p) => p.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it("rating: 투표 수가 적은 항목은 뒤로 보낸다", () => {
    const ids = sortPrograms(catalog.movies, "rating").map((p) => p.id);
    // id 2는 9.8점이지만 3표뿐이라 마지막
    expect(ids).toEqual([1, 3, 2]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...catalog.movies];
    sortPrograms(catalog.movies, "latest");
    expect(catalog.movies).toEqual(original);
  });
});

describe("queryCatalog", () => {
  it("kind=all이면 영화와 TV를 합쳐 정렬한다", () => {
    const { items, total } = queryCatalog(catalog, {});
    expect(total).toBe(5);
    expect(items[0]).toMatchObject({ id: 1, mediaType: "tvshow" });
  });

  it("providerId로 필터링한다", () => {
    const { items } = queryCatalog(catalog, { providerId: 1883, kind: "movie" });
    expect(items.map((p) => p.id)).toEqual([3, 2]);
  });

  it("genreId로 필터링한다", () => {
    const { items } = queryCatalog(catalog, { genreId: 18 });
    expect(items.map((p) => `${p.mediaType}-${p.id}`)).toEqual([
      "tvshow-1",
      "movie-3",
      "movie-2",
    ]);
  });

  it("페이지네이션: limit/page를 적용하고 total은 전체 개수", () => {
    const page1 = queryCatalog(catalog, { limit: 2, page: 1 });
    const page2 = queryCatalog(catalog, { limit: 2, page: 2 });
    const page3 = queryCatalog(catalog, { limit: 2, page: 3 });
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page3.items).toHaveLength(1);
    expect(page1.total).toBe(5);
  });
});

describe("getAvailableGenres", () => {
  it("콘텐츠가 있는 장르만 개수 내림차순으로 반환", () => {
    const genres = getAvailableGenres(catalog);
    expect(genres).toEqual([
      { id: 18, name: "드라마", count: 3 },
      { id: 28, name: "액션", count: 2 },
    ]);
  });

  it("providerId를 주면 해당 OTT 콘텐츠 기준으로 센다", () => {
    const genres = getAvailableGenres(catalog, 1883);
    expect(genres.map((g) => [g.id, g.count])).toEqual([
      [18, 2],
      [28, 1],
    ]);
  });
});

describe("getRecentReleases", () => {
  const now = new Date("2026-09-22T00:00:00Z");

  it("최근 N일 안에 공개된 것만 최신순으로", () => {
    const items = getRecentReleases(catalog, { days: 30, now });
    expect(items.map((p) => `${p.mediaType}-${p.id}`)).toEqual(["tvshow-1", "movie-1"]);
  });

  it("미래 날짜는 제외한다", () => {
    const future: Catalog = {
      movies: [program({ id: 9, mediaType: "movie", releaseDate: "2026-12-25" })],
      tvShows: [],
    };
    expect(getRecentReleases(future, { days: 365, now })).toEqual([]);
  });
});

describe("selectTrailerPrograms", () => {
  const withTrailer = (id: number, mediaType: "movie" | "tvshow", key: string | null, popularity: number, providers = [netflix]) =>
    program({ id, mediaType, trailerKey: key, popularity, providers, releaseDate: `20${String(id).padStart(2, "0")}-01-01` });
  const trailerCatalog: Catalog = {
    movies: [withTrailer(1, "movie", "k1", 90), withTrailer(2, "movie", null, 80), withTrailer(3, "movie", "k1", 70), withTrailer(4, "movie", "k4", 60, [tving])],
    tvShows: [withTrailer(5, "tvshow", "k5", 95), withTrailer(6, "tvshow", "k6", 10)],
  };

  it("예고편이 있는 항목만, 예고편 키 기준 중복 제거, 인기순", async () => {
    const { selectTrailerPrograms } = await import("../catalog");
    const items = selectTrailerPrograms(trailerCatalog, {});
    expect(items.map((p) => `${p.mediaType}-${p.id}`)).toEqual(["tvshow-5", "movie-1", "movie-4", "tvshow-6"]);
  });

  it("kind / providerId / sort / limit을 반영한다", async () => {
    const { selectTrailerPrograms } = await import("../catalog");
    expect(selectTrailerPrograms(trailerCatalog, { kind: "movie" }).map((p) => p.id)).toEqual([1, 4]);
    expect(selectTrailerPrograms(trailerCatalog, { providerId: 1883 }).map((p) => p.id)).toEqual([4]);
    expect(selectTrailerPrograms(trailerCatalog, { sort: "latest", limit: 2 }).map((p) => p.id)).toEqual([6, 5]);
  });
});

describe("buildRecommendRows", () => {
  const now = new Date("2026-09-22T00:00:00Z");
  const mk = (id: number, mediaType: "movie" | "tvshow", popularity: number, genres = [action], releaseDate: string | null = "2020-01-01", posterPath: string | null = "/p.jpg") =>
    program({ id, mediaType, popularity, genres, releaseDate, posterPath, providers: [netflix] });
  const bigCatalog: Catalog = {
    movies: [
      mk(1, "movie", 100, [action, drama], "2026-09-10"),
      mk(2, "movie", 90, [action], "2026-09-15", null), // 포스터 없음 → 신작 제외
      mk(3, "movie", 80, [drama]),
      mk(4, "movie", 70, [action]),
      mk(5, "movie", 60, [drama]),
    ],
    tvShows: [mk(6, "tvshow", 95, [drama], "2026-09-01"), mk(7, "tvshow", 50, [action])],
  };

  it("신작 행은 최근 N일 안에서 인기순이며 포스터 없는 항목은 제외한다", async () => {
    const { buildRecommendRows } = await import("../catalog");
    const rows = buildRecommendRows(bigCatalog, { now, recentDays: 30, rowLimit: 10, genreRowCount: 5 });
    const recent = rows.find((r) => r.key === "recent")!;
    expect(recent.programs.map((p) => p.id)).toEqual([1, 6]);
  });

  it("장르 행은 앞 행에 이미 나온 작품을 제외하고, 행당 개수 제한을 지킨다", async () => {
    const { buildRecommendRows } = await import("../catalog");
    const rows = buildRecommendRows(bigCatalog, { now, recentDays: 30, rowLimit: 2, genreRowCount: 5, minGenreRowSize: 1 });
    const shownBefore = new Set(rows.filter((r) => !r.key.startsWith("genre-")).flatMap((r) => r.programs.map((p) => `${p.mediaType}-${p.id}`)));
    for (const row of rows.filter((r) => r.key.startsWith("genre-"))) {
      expect(row.programs.length).toBeLessThanOrEqual(2);
      for (const p of row.programs) expect(shownBefore.has(`${p.mediaType}-${p.id}`)).toBe(false);
    }
  });

  it("kind 필터와 정렬을 반영하고, 행 제목에는 정렬 접미사를 붙이지 않는다", async () => {
    const { buildRecommendRows } = await import("../catalog");
    const rows = buildRecommendRows(bigCatalog, { now, kind: "movie", sort: "latest", rowLimit: 10, genreRowCount: 5, minGenreRowSize: 1 });
    expect(rows.find((r) => r.key === "tvshows")).toBeUndefined();
    expect(rows.every((r) => r.programs.every((p) => p.mediaType === "movie"))).toBe(true);
    expect(rows.map((r) => r.title)).not.toContainEqual(expect.stringContaining("최신순"));
  });
});
