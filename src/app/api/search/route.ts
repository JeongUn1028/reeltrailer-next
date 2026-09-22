import { NextResponse } from "next/server";
import { searchPrograms } from "@/server/contents";
import { isProgramKindFilter } from "@/app/types/types";
import { jsonError, parsePositiveInt } from "@/app/lib/apiResponse";
import { SEARCH_PAGE_SIZE } from "@/app/lib/pageSizes";

//* 검색 결과. 무한 스크롤을 위해 page/kind를 받고 { items, page, hasMore } 형태로 반환
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const providerId = parsePositiveInt(searchParams.get("providerId"));
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), SEARCH_PAGE_SIZE);
    const kindParam = searchParams.get("kind") ?? "all";

    if (providerId === null) {
      return jsonError("providerId는 양의 정수여야 합니다.", 400);
    }
    if (page === null || limit === null || limit > 50) {
      return jsonError("page와 limit은 양의 정수여야 합니다 (limit 최대 50).", 400);
    }
    if (!isProgramKindFilter(kindParam)) {
      return jsonError("kind는 all | movie | tvshow 중 하나여야 합니다.", 400);
    }

    const result = await searchPrograms(query, { providerId, kind: kindParam, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] 검색 에러:", error);
    return jsonError("검색 중 에러가 발생했습니다.", 500);
  }
}
