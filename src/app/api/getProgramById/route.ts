import { getProgramById } from "@/server/contents";
import { isValidKind } from "@/app/lib/isValidKind";
import { jsonError, jsonWithCache, parsePositiveInt } from "@/app/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parsePositiveInt(searchParams.get("id"));
    const kind = searchParams.get("kind") ?? undefined;

    if (id === undefined) {
      return jsonError("id 파라미터가 필요합니다.", 400);
    }
    if (id === null) {
      return jsonError("id는 양의 정수여야 합니다.", 400);
    }
    if (!isValidKind(kind)) {
      return jsonError("kind는 movie 또는 tvshow여야 합니다.", 400);
    }

    const program = await getProgramById(id, kind);
    if (!program) {
      return jsonError("프로그램을 찾을 수 없습니다.", 404);
    }

    return jsonWithCache(program);
  } catch (error) {
    console.error("[API] 상세 조회 에러:", error);
    return jsonError("프로그램을 가져오는 중 에러가 발생했습니다.", 500);
  }
}
