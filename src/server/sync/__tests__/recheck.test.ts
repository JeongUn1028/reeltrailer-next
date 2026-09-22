import { describe, expect, it } from "vitest";
import { chooseRecheckBudget, splitRecheckResults } from "../recheck";

describe("splitRecheckResults", () => {
  it("제공자가 없는 항목은 삭제 대상, 있는 항목은 갱신 대상, 조회 실패는 보류", () => {
    const { toDelete, toKeep, failed } = splitRecheckResults([
      { id: 1, providers: [] },
      { id: 2, providers: [{ provider_id: 8, provider_name: "Netflix", logo_path: null, display_priority: 0 }] },
      { id: 3, error: new Error("timeout") },
    ]);
    expect(toDelete).toEqual([1]);
    expect(toKeep.map((k) => k.id)).toEqual([2]);
    expect(failed).toEqual([3]);
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
