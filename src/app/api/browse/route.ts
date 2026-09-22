import { getPrograms } from "@/server/contents";
import { isOttSlug, ottSlugToProviderId } from "@/app/lib/programUrls";
import { parseListSearchParams } from "@/app/lib/listParams";
import { jsonError, jsonWithCache, parsePositiveInt } from "@/app/lib/apiResponse";
import { BROWSE_PAGE_SIZE } from "@/app/lib/pageSizes";

//* /browse 페이지 무한 스크롤용. 쿼리 파라미터는 페이지와 동일 (ott, kind, genre, sort, page, limit)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { kind, sort, page, genreId, ott } = parseListSearchParams({
      kind: searchParams.get("kind") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      genre: searchParams.get("genre") ?? undefined,
      ott: searchParams.get("ott") ?? undefined,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), BROWSE_PAGE_SIZE);
    if (limit === null || limit > 100) {
      return jsonError("limit은 1~100 사이의 정수여야 합니다.", 400);
    }
    if (ott && !isOttSlug(ott)) {
      return jsonError("지원하지 않는 OTT입니다.", 400);
    }

    const { items, total } = await getPrograms({
      providerId: ottSlugToProviderId(ott),
      kind,
      genreId,
      sort,
      page,
      limit,
    });

    return jsonWithCache({ items, total, page, limit, hasMore: page * limit < total });
  } catch (error) {
    console.error("[API] browse 조회 에러:", error);
    return jsonError("목록을 가져오는 중 에러가 발생했습니다.", 500);
  }
}
