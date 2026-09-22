import type { ProgramKindFilter, ProgramSortKey } from "@/app/types/types";
import { getCatalog, selectTrailerPrograms } from "@/server/contents";
import TrailerShowcase from "./trailer-showcase";

const TRAILER_LIMIT = 20;

type TrailerShowcaseSectionProps = {
  providerId?: number;
  kind?: ProgramKindFilter;
  sort?: ProgramSortKey;
};

//* 서버에서 카탈로그(캐시)로 예고편 목록을 고른 뒤 클라이언트 쇼케이스에 넘긴다.
//* 홈의 OTT/유형/정렬 조건을 그대로 반영한다.
export default async function TrailerShowcaseSection({
  providerId,
  kind = "all",
  sort = "popular",
}: TrailerShowcaseSectionProps) {
  const catalog = await getCatalog();
  const programs = selectTrailerPrograms(catalog, { providerId, kind, sort, limit: TRAILER_LIMIT });
  return <TrailerShowcase programs={programs} />;
}
