import { NextResponse } from "next/server";
import { searchPrograms } from "@/server/contents";
import { jsonError, parsePositiveInt } from "@/app/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const providerId = parsePositiveInt(searchParams.get("providerId"));

    if (providerId === null) {
      return jsonError("providerId는 양의 정수여야 합니다.", 400);
    }

    const results = await searchPrograms(query, providerId);
    return NextResponse.json(results);
  } catch (error) {
    console.error("[API] 검색 에러:", error);
    return jsonError("검색 중 에러가 발생했습니다.", 500);
  }
}
