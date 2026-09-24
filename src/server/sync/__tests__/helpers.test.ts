import { describe, expect, it, vi } from "vitest";
import providerSlugs from "@/config/ott-provider-ids.json";
import {
  hasSupportedProvider,
  isFailureRateAcceptable,
  mergeNetflixProviders,
  NETFLIX_PROVIDER_ID,
  NETFLIX_WITH_ADS_PROVIDER_ID,
  parseDate,
  processInBatches,
  SUPPORTED_PROVIDER_IDS,
  type TMDBProvider,
} from "../helpers";

const provider = (id: number, name: string): TMDBProvider => ({
  provider_id: id,
  provider_name: name,
  logo_path: null,
  display_priority: 0,
});

describe("mergeNetflixProviders", () => {
  it("광고형 Netflix만 있으면 Netflix(8)로 치환한다", () => {
    const result = mergeNetflixProviders([
      provider(NETFLIX_WITH_ADS_PROVIDER_ID, "Netflix Standard with Ads"),
    ]);
    expect(result).toEqual([
      expect.objectContaining({ provider_id: NETFLIX_PROVIDER_ID, provider_name: "Netflix" }),
    ]);
  });

  it("일반 Netflix와 광고형이 같이 있으면 하나만 남긴다", () => {
    const result = mergeNetflixProviders([
      provider(NETFLIX_WITH_ADS_PROVIDER_ID, "Netflix Standard with Ads"),
      provider(NETFLIX_PROVIDER_ID, "Netflix"),
      provider(337, "Disney Plus"),
    ]);
    expect(result.map((p) => p.provider_id)).toEqual([NETFLIX_PROVIDER_ID, 337]);
    expect(result[0].provider_name).toBe("Netflix");
  });

  it("다른 제공자는 그대로 두고 중복만 제거한다", () => {
    const result = mergeNetflixProviders([
      provider(1883, "TVING"),
      provider(1883, "TVING"),
      provider(356, "Wavve"),
    ]);
    expect(result.map((p) => p.provider_id)).toEqual([1883, 356]);
  });
});

describe("hasSupportedProvider", () => {
  it("지원 OTT 목록은 ott-provider-ids.json과 같다", () => {
    expect([...SUPPORTED_PROVIDER_IDS].sort()).toEqual(Object.values(providerSlugs).map(Number).sort());
  });

  it("지원 OTT가 하나라도 있으면 true", () => {
    expect(hasSupportedProvider([provider(2, "Apple TV"), provider(1883, "TVING")])).toBe(true);
  });

  it("지원하지 않는 OTT에만 있으면 false", () => {
    expect(hasSupportedProvider([provider(2, "Apple TV"), provider(119, "Amazon Prime Video")])).toBe(false);
    expect(hasSupportedProvider([])).toBe(false);
  });
});

describe("parseDate", () => {
  it("빈 값과 잘못된 날짜는 null", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("유효한 날짜는 Date로 변환", () => {
    expect(parseDate("2026-01-15")?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("processInBatches", () => {
  it("실패한 아이템을 건너뛰고 결과에 기록한다", async () => {
    const processed: number[] = [];
    const result = await processInBatches(
      [1, 2, 3, 4, 5],
      2,
      0,
      async (n) => {
        if (n === 3) throw new Error("boom");
        processed.push(n);
      },
      (n) => `item-${n}`,
    );

    expect(processed).toEqual([1, 2, 4, 5]);
    expect(result.succeeded).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([{ item: "item-3", message: "boom" }]);
  });

  it("배치 크기만큼만 동시에 실행한다", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await processInBatches([1, 2, 3, 4, 5, 6], 3, 0, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
    });
    expect(maxInFlight).toBe(3);
  });

  it("describe를 주지 않으면 실패 내역에 기본 라벨로 기록한다", async () => {
    const result = await processInBatches([1], 1, 0, async () => {
      throw new Error("boom");
    });
    expect(result.errors).toEqual([{ item: "item", message: "boom" }]);
  });

  it("shouldStop이 true가 되면 남은 배치를 처리하지 않고 skipped로 센다", async () => {
    const processed: number[] = [];
    const result = await processInBatches(
      [1, 2, 3, 4, 5],
      2,
      0,
      async (n) => {
        processed.push(n);
      },
      undefined,
      () => processed.length >= 2,
    );

    expect(processed).toEqual([1, 2]);
    expect(result).toMatchObject({ succeeded: 2, failed: 0, skipped: 3 });
  });

  it("마지막 배치 뒤에는 대기하지 않는다", async () => {
    vi.useFakeTimers();
    const promise = processInBatches([1, 2], 2, 1000, async () => {});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ succeeded: 2 });
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

describe("isFailureRateAcceptable", () => {
  it("실패율이 임계값 이하이면 true", () => {
    expect(isFailureRateAcceptable({ succeeded: 95, failed: 5, skipped: 0, errors: [] }, 0.1)).toBe(true);
  });

  it("실패율이 임계값을 넘으면 false", () => {
    expect(isFailureRateAcceptable({ succeeded: 80, failed: 20, skipped: 0, errors: [] }, 0.1)).toBe(false);
  });

  it("처리한 아이템이 없으면 false (삭제 방지)", () => {
    expect(isFailureRateAcceptable({ succeeded: 0, failed: 0, skipped: 0, errors: [] }, 0.1)).toBe(false);
  });
});
