import { getPrograms } from "@/server/contents";
import { isProgramSortKey } from "@/app/types/types";
import { jsonError, jsonWithCache, parsePositiveInt } from "@/app/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);
    const providerId = parsePositiveInt(searchParams.get("providerId"));
    const sortParam = searchParams.get("sort") ?? "popular";

    if (page === null || limit === null) {
      return jsonError("page와 limit은 양의 정수여야 합니다.", 400);
    }
    if (providerId === null) {
      return jsonError("providerId는 양의 정수여야 합니다.", 400);
    }
    if (!isProgramSortKey(sortParam)) {
      return jsonError("sort는 popular | latest | rating 중 하나여야 합니다.", 400);
    }

    const { items, total } = await getPrograms({
      kind: "tvshow",
      providerId,
      page,
      limit,
      sort: sortParam,
    });

    return jsonWithCache({ tvShows: items, total, page, limit });
  } catch (error) {
    console.error("[API] TV 프로그램 조회 에러:", error);
    return jsonError("TV 프로그램을 가져오는 중 에러가 발생했습니다.", 500);
  }
}
