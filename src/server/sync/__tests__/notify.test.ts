import { describe, expect, it } from "vitest";
import { formatSyncSummary } from "../notify";

describe("formatSyncSummary", () => {
  it("성공 요약에 영화/TV 수치를 포함한다", () => {
    const text = formatSyncSummary({
      success: true,
      durationMs: 12345,
      movies: { succeeded: 280, failed: 2, removed: 5 },
      tvShows: { succeeded: 290, failed: 0, removed: 1 },
    });
    expect(text).toContain("✅ TMDB 동기화 성공 (12.3s)");
    expect(text).toContain("영화: 성공 280 / 실패 2 / 삭제 5");
    expect(text).toContain("TV: 성공 290 / 실패 0 / 삭제 1");
  });

  it("실패 요약에 메시지를 포함한다", () => {
    const text = formatSyncSummary({ success: false, durationMs: 500, message: "TMDB down" });
    expect(text).toContain("❌ TMDB 동기화 실패");
    expect(text).toContain("TMDB down");
  });
});
