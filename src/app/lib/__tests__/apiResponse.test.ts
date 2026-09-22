import { describe, expect, it } from "vitest";
import { CATALOG_CACHE_CONTROL, jsonError, jsonWithCache, parsePositiveInt } from "../apiResponse";

describe("parsePositiveInt", () => {
  it("없으면 fallback, fallback도 없으면 undefined", () => {
    expect(parsePositiveInt(null, 20)).toBe(20);
    expect(parsePositiveInt("", 20)).toBe(20);
    expect(parsePositiveInt(null)).toBeUndefined();
  });

  it("양의 정수만 허용하고 나머지는 null", () => {
    expect(parsePositiveInt("7")).toBe(7);
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("-3")).toBeNull();
    expect(parsePositiveInt("1.5")).toBeNull();
    expect(parsePositiveInt("abc")).toBeNull();
  });
});

describe("응답 헬퍼", () => {
  it("jsonWithCache는 CDN 캐시 헤더를 붙인다", async () => {
    const res = jsonWithCache({ ok: true });
    expect(res.headers.get("Cache-Control")).toBe(CATALOG_CACHE_CONTROL);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("jsonError는 상태 코드와 메시지를 담는다", async () => {
    const res = jsonError("bad", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad" });
  });
});
