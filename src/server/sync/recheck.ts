//* 순환 재검증: 가장 오래전에 확인한 콘텐츠의 국내 OTT 제공 여부를 다시 조회해
//* 제공이 끝난 콘텐츠를 삭제한다. 전체를 매일 볼 수 없으므로 실행 시간 예산 안에서 일부씩 돈다.
import type { TMDBProvider } from "./helpers";

export type RecheckResult =
  | { id: number; providers: TMDBProvider[] }
  | { id: number; error: unknown };

export function splitRecheckResults(results: RecheckResult[]) {
  const toDelete: number[] = [];
  const toKeep: { id: number; providers: TMDBProvider[] }[] = [];
  const failed: number[] = [];
  for (const result of results) {
    if ("error" in result) failed.push(result.id);
    else if (result.providers.length === 0) toDelete.push(result.id);
    else toKeep.push(result);
  }
  return { toDelete, toKeep, failed };
}

//* 남은 실행 시간으로 처리할 수 있는 재검증 개수 (항목당 요청 1개 기준)
export function chooseRecheckBudget({
  remainingMs,
  msPerRequest,
  max,
}: {
  remainingMs: number;
  msPerRequest: number;
  max: number;
}): number {
  if (remainingMs <= 0 || msPerRequest <= 0) return 0;
  return Math.max(0, Math.min(max, Math.floor(remainingMs / msPerRequest)));
}
