import { describe, expect, it } from "vitest";
import type { TMDBProvider } from "../helpers";
import { chooseRecheckBudget, splitRecheckResults } from "../recheck";
import { TmdbRequestError } from "../tmdb";

const provider = (id: number, name: string): TMDBProvider => ({
  provider_id: id,
  provider_name: name,
  logo_path: null,
  display_priority: 0,
});

describe("splitRecheckResults", () => {
  it("제공자가 없는 항목은 삭제 대상, 있는 항목은 갱신 대상, 조회 실패는 보류", () => {
    const { toDelete, toKeep, failed } = splitRecheckResults([
      { id: 1, providers: [] },
      { id: 2, providers: [provider(8, "Netflix")] },
      { id: 3, error: new Error("timeout") },
    ]);
    expect(toDelete).toEqual([1]);
    expect(toKeep.map((k) => k.id)).toEqual([2]);
    expect(failed).toEqual([3]);
  });

  it("지원하지 않는 OTT에만 남은 항목은 삭제 대상으로 분류한다", () => {
    const { toDelete, toKeep } = splitRecheckResults([
      { id: 1, providers: [provider(119, "Amazon Prime Video")] },
      { id: 2, providers: [provider(119, "Amazon Prime Video"), provider(337, "Disney Plus")] },
    ]);
    expect(toDelete).toEqual([1]);
    expect(toKeep.map((k) => k.id)).toEqual([2]);
  });

  it("TMDB에서 삭제되어 404가 나면 삭제 대상, 그 밖의 HTTP 오류는 보류한다", () => {
    const { toDelete, failed } = splitRecheckResults([
      { id: 1, error: new TmdbRequestError("/movie/1/watch/providers", 404) },
      { id: 2, error: new TmdbRequestError("/movie/2/watch/providers", 429) },
    ]);
    expect(toDelete).toEqual([1]);
    expect(failed).toEqual([2]);
  });
});

describe("chooseRecheckBudget", () => {
  it("남은 실행 시간에 맞춰 재검증 개수를 줄인다 (요청당 예상 시간 기준)", () => {
    // 60초 남음, 요청당 0.05초 → 최대 1200개지만 상한 800
    expect(chooseRecheckBudget({ remainingMs: 60_000, msPerRequest: 50, max: 800 })).toBe(800);
    // 10초 남음 → 200개
    expect(chooseRecheckBudget({ remainingMs: 10_000, msPerRequest: 50, max: 800 })).toBe(200);
    // 시간이 없으면 0
    expect(chooseRecheckBudget({ remainingMs: 0, msPerRequest: 50, max: 800 })).toBe(0);
  });
});
