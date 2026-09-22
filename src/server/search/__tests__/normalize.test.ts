import { describe, expect, it } from "vitest";
import { buildSearchText, normalizeSearchText, rankMatch } from "../normalize";

describe("normalizeSearchText", () => {
  it("소문자화하고 공백·구두점·기호를 제거한다", () => {
    expect(normalizeSearchText("오징어 게임")).toBe("오징어게임");
    expect(normalizeSearchText("  Squid   Game!  ")).toBe("squidgame");
    expect(normalizeSearchText("D.P. (디피)")).toBe("dp디피");
    expect(normalizeSearchText("스파이더맨: 노 웨이 홈")).toBe("스파이더맨노웨이홈");
  });

  it("전각/호환 문자를 NFKC로 정규화하고 빈 값은 빈 문자열", () => {
    expect(normalizeSearchText("ＡＢＣ　１２３")).toBe("abc123");
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });
});

describe("buildSearchText", () => {
  it("제목·원제·영문 제목을 정규화해 |로 잇고 중복/빈 값은 제외한다", () => {
    expect(buildSearchText({ title: "오징어 게임", originalTitle: "오징어 게임", englishTitle: "Squid Game" })).toBe(
      "오징어게임|squidgame",
    );
    expect(buildSearchText({ title: "기생충", originalTitle: null, englishTitle: null })).toBe("기생충");
  });
});

describe("rankMatch", () => {
  const hit = { titleNormalized: "오징어게임", searchText: "오징어게임|squidgame" };
  it("정확 4 > 접두 3 > 부분 2 > 그 외 1", () => {
    expect(rankMatch(hit, "오징어게임")).toBe(4);
    expect(rankMatch(hit, "오징어")).toBe(3);
    expect(rankMatch(hit, "게임")).toBe(2);
    expect(rankMatch(hit, "squid")).toBe(2);
    expect(rankMatch(hit, "오징이")).toBe(1);
  });
});
