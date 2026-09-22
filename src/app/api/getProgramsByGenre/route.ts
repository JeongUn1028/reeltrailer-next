import genres from "@/config/genre.json";
import { getPrograms } from "@/server/contents";
import { isProgramSortKey } from "@/app/types/types";
import { jsonError, jsonWithCache, parsePositiveInt } from "@/app/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genreParam = searchParams.get("genre");
    const limit = parsePositiveInt(searchParams.get("limit"), 20);
    const providerId = parsePositiveInt(searchParams.get("providerId"));
    const sortParam = searchParams.get("sort") ?? "popular";

    if (!genreParam) {
      return jsonError("genre 파라미터가 필요합니다.", 400);
    }
    if (limit === null) {
      return jsonError("limit은 양의 정수여야 합니다.", 400);
    }
    if (providerId === null) {
      return jsonError("providerId는 양의 정수여야 합니다.", 400);
    }
    if (!isProgramSortKey(sortParam)) {
      return jsonError("sort는 popular | latest | rating 중 하나여야 합니다.", 400);
    }

    // 장르 이름 또는 ID 모두 허용
    const genre =
      genres.find((g) => g.name === genreParam) ??
      genres.find((g) => String(g.id) === genreParam);
    if (!genre) {
      return jsonError("유효한 장르명을 입력해 주세요.", 400);
    }

    const [movies, tvShows] = await Promise.all([
      getPrograms({ kind: "movie", genreId: genre.id, providerId, limit, sort: sortParam }),
      getPrograms({ kind: "tvshow", genreId: genre.id, providerId, limit, sort: sortParam }),
    ]);

    return jsonWithCache({ movies: movies.items, tvShows: tvShows.items });
  } catch (error) {
    console.error("[API] 장르별 조회 에러:", error);
    return jsonError("장르별 콘텐츠를 가져오는 중 에러가 발생했습니다.", 500);
  }
}
