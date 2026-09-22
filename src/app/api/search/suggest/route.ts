import { NextResponse } from "next/server";
import { searchSuggestions } from "@/server/contents";
import { jsonError, parsePositiveInt } from "@/app/lib/apiResponse";

//* 검색창 자동완성용. 한글은 1글자도 의미가 있으므로 1글자부터 응답
const MIN_QUERY_LENGTH = 1;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const providerId = parsePositiveInt(searchParams.get("providerId"));

    if (providerId === null) {
      return jsonError("providerId는 양의 정수여야 합니다.", 400);
    }
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json([]);
    }

    const suggestions = await searchSuggestions(query, providerId);
    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[API] 자동완성 에러:", error);
    return jsonError("자동완성 중 에러가 발생했습니다.", 500);
  }
}
