import { NextResponse } from "next/server";

//* 카탈로그 기반 API 응답에 붙이는 CDN 캐시 헤더.
//* 데이터는 하루 한 번 바뀌므로 1시간 캐시 + 하루 동안 stale 응답 허용
export const CATALOG_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

export function jsonWithCache<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": CATALOG_CACHE_CONTROL, ...init?.headers },
  });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

//* 양의 정수 쿼리 파라미터 파싱. 없으면 fallback, 잘못된 값이면 null
export function parsePositiveInt(value: string | null, fallback: number): number | null;
export function parsePositiveInt(value: string | null): number | null | undefined;
export function parsePositiveInt(
  value: string | null,
  fallback?: number,
): number | null | undefined {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
