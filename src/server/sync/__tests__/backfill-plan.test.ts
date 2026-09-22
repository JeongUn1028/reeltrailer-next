import { describe, expect, it } from "vitest";
import { planBackfillWindows, remainingWindows, type BackfillWindow } from "../backfill-plan";

describe("planBackfillWindows", () => {
  it("최신 연도부터 시작 연도까지 영화/TV 창을 만들고 마지막에 날짜 없는 항목 창을 붙인다", () => {
    const windows = planBackfillWindows({ fromYear: 2024, toYear: 2026 });
    expect(windows.map((w) => w.id)).toEqual([
      "movie:2026", "tv:2026",
      "movie:2025", "tv:2025",
      "movie:2024", "tv:2024",
      "movie:undated", "tv:undated",
    ]);
    const movie2025 = windows.find((w) => w.id === "movie:2025")!;
    expect(movie2025.dateParams).toEqual({
      "primary_release_date.gte": "2025-01-01",
      "primary_release_date.lte": "2025-12-31",
    });
    const tvUndated = windows.find((w) => w.id === "tv:undated")!;
    expect(tvUndated.dateParams).toEqual({ "first_air_date.lte": "1899-12-31" });
  });

  it("kinds를 지정하면 해당 유형만", () => {
    const windows = planBackfillWindows({ fromYear: 2026, toYear: 2026, kinds: ["tv"] });
    expect(windows.map((w) => w.id)).toEqual(["tv:2026", "tv:undated"]);
  });
});

describe("remainingWindows", () => {
  const windows: BackfillWindow[] = planBackfillWindows({ fromYear: 2025, toYear: 2026, kinds: ["movie"] });

  it("완료된 창은 제외하고, 진행 중인 창은 다음 페이지부터 이어간다", () => {
    const state = { completed: ["movie:2026"], progress: { "movie:2025": { nextPage: 4 } } };
    const remaining = remainingWindows(windows, state);
    expect(remaining.map((w) => [w.id, w.startPage])).toEqual([
      ["movie:2025", 4],
      ["movie:undated", 1],
    ]);
  });

  it("상태가 없으면 전부 1페이지부터", () => {
    expect(remainingWindows(windows, { completed: [], progress: {} }).every((w) => w.startPage === 1)).toBe(true);
  });
});
