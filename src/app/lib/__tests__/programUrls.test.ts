import { describe, expect, it } from "vitest";
import {
  backdropUrl,
  browseHref,
  genreLabel,
  isOttSlug,
  ottSearchUrl,
  ottSlugToProviderId,
  posterUrl,
  programHref,
  releaseYear,
} from "../programUrls";

describe("이미지 URL", () => {
  it("TMDB 경로를 사이즈와 함께 조합한다", () => {
    expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
    expect(posterUrl("/abc.jpg", "w780")).toBe("https://image.tmdb.org/t/p/w780/abc.jpg");
    expect(backdropUrl("/bg.jpg")).toBe("https://image.tmdb.org/t/p/w1280/bg.jpg");
  });

  it("절대 URL은 그대로 두고, 없으면 null", () => {
    expect(posterUrl("https://example.com/x.jpg")).toBe("https://example.com/x.jpg");
    expect(posterUrl(null)).toBeNull();
    expect(backdropUrl(undefined)).toBeNull();
  });
});

describe("programHref / releaseYear", () => {
  it("상세 URL에 kind를 포함한다", () => {
    expect(programHref(10, "movie")).toBe("/program/10?kind=movie");
    expect(programHref(10, "tvshow")).toBe("/program/10?kind=tvshow");
  });

  it("연도를 추출하고 잘못된 값은 null", () => {
    expect(releaseYear("2024-05-01")).toBe(2024);
    expect(releaseYear(new Date("2020-01-01"))).toBe(2020);
    expect(releaseYear(null)).toBeNull();
    expect(releaseYear("garbage")).toBeNull();
  });
});

describe("OTT slug", () => {
  it("설정된 slug만 provider ID로 변환한다", () => {
    expect(isOttSlug("netflix")).toBe(true);
    expect(isOttSlug("hulu")).toBe(false);
    expect(ottSlugToProviderId("netflix")).toBe(8);
    expect(ottSlugToProviderId("tving")).toBe(1883);
    expect(ottSlugToProviderId(undefined)).toBeUndefined();
  });
});

describe("genreLabel", () => {
  it("config 이름을 우선 사용하고 없으면 fallback", () => {
    expect(genreLabel(28)).toBe("액션");
    expect(genreLabel(10759)).toBe("액션 & 어드벤처");
    expect(genreLabel(999999, "DB 이름")).toBe("DB 이름");
  });
});

describe("browseHref", () => {
  it("기본값과 같은 파라미터는 생략한다", () => {
    expect(browseHref({})).toBe("/browse");
    expect(browseHref({ kind: "all", sort: "popular", page: 1 })).toBe("/browse");
  });

  it("지정된 파라미터만 포함한다", () => {
    expect(browseHref({ ott: "netflix", kind: "movie", genre: 18, sort: "latest", page: 3 })).toBe(
      "/browse?ott=netflix&kind=movie&genre=18&sort=latest&page=3",
    );
  });
});

describe("ottSearchUrl", () => {
  it("지원 OTT는 제목이 인코딩된 검색 URL을 반환", () => {
    expect(ottSearchUrl("Netflix", "기생충")).toBe(
      `https://www.netflix.com/search?q=${encodeURIComponent("기생충")}`,
    );
    expect(ottSearchUrl("Disney+", "Loki")).toContain("disneyplus.com/search/Loki");
    expect(ottSearchUrl("TVING", "환승연애")).toContain("tving.com/search");
  });

  it("모르는 제공자는 null", () => {
    expect(ottSearchUrl("Apple TV Plus", "x")).toBeNull();
  });
});
