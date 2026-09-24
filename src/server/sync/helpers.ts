//* TMDB 동기화에서 쓰는 순수 헬퍼. 외부 의존성이 없어 단위 테스트가 쉽다.

export const NETFLIX_PROVIDER_ID = 8;
export const NETFLIX_WITH_ADS_PROVIDER_ID = 1796;

//* 서비스 대상 OTT (src/config/ott-provider-ids.json과 같은 값, 테스트로 일치를 확인한다)
export const SUPPORTED_PROVIDER_IDS: ReadonlySet<number> = new Set([NETFLIX_PROVIDER_ID, 337, 97, 356, 1883]);

export interface TMDBProvider {
  provider_name: string;
  provider_id: number;
  logo_path: string | null;
  display_priority: number;
}

//* ms만큼 대기
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

//* 날짜 문자열 유효성 검사 및 Date 변환
export const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

//* Netflix Standard with Ads(1796)를 Netflix(8)로 병합하고, 같은 provider가 중복되면 하나만 남긴다
export function mergeNetflixProviders(providers: TMDBProvider[]): TMDBProvider[] {
  const merged = new Map<number, TMDBProvider>();

  for (const provider of providers) {
    if (provider.provider_id === NETFLIX_WITH_ADS_PROVIDER_ID) {
      // 이미 일반 Netflix가 있으면 그것을 유지, 없으면 광고형 정보를 Netflix ID로 저장
      if (!merged.has(NETFLIX_PROVIDER_ID)) {
        merged.set(NETFLIX_PROVIDER_ID, {
          ...provider,
          provider_id: NETFLIX_PROVIDER_ID,
          provider_name: "Netflix",
        });
      }
      continue;
    }
    if (!merged.has(provider.provider_id)) {
      merged.set(provider.provider_id, provider);
    }
  }

  return Array.from(merged.values());
}

//* 대상 OTT 중 하나라도 제공하는지. 쿠팡플레이·Apple TV+ 등에만 남은 작품은 제공 종료로 본다
export const hasSupportedProvider = (providers: TMDBProvider[]): boolean =>
  providers.some((provider) => SUPPORTED_PROVIDER_IDS.has(provider.provider_id));

export interface BatchResult {
  succeeded: number;
  failed: number;
  //* shouldStop으로 중단되어 처리하지 못한 개수
  skipped: number;
  errors: { item: string; message: string }[];
}

//* 아이템 배열을 batchSize만큼씩 끊어 병렬 처리하고, 배치 사이에 delayMs만큼 대기한다.
//* 한 아이템이 실패해도 나머지는 계속 진행되며, 실패 내역은 결과에 모아 반환한다.
//* shouldStop이 true를 돌려주면 다음 배치부터 처리하지 않는다 (실행 시간 제한 대비).
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processFn: (item: T) => Promise<void>,
  describe: (item: T) => string = () => "item",
  shouldStop: () => boolean = () => false,
): Promise<BatchResult> {
  const result: BatchResult = { succeeded: 0, failed: 0, skipped: 0, errors: [] };

  for (let i = 0; i < items.length; i += batchSize) {
    if (shouldStop()) {
      result.skipped = items.length - i;
      break;
    }
    const batch = items.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        try {
          await processFn(item);
          result.succeeded += 1;
        } catch (error) {
          result.failed += 1;
          result.errors.push({
            item: describe(item),
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );

    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return result;
}

//* 실패 비율이 임계값 이하일 때만 true. 대량 실패 시 stale 삭제를 건너뛰기 위한 안전장치
export function isFailureRateAcceptable(
  result: BatchResult,
  maxFailureRatio: number,
): boolean {
  const total = result.succeeded + result.failed;
  if (total === 0) return false;
  return result.failed / total <= maxFailureRatio;
}
