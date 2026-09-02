import { NextResponse } from "next/server";
import { getMoviesList } from "@/server/contents";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (!searchParams.has("page") || isNaN(Number(searchParams.get("page")))) {
      return NextResponse.json(
        { error: "Missing or invalid required query parameter: page" },
        { status: 400 },
      );
    }
    if (
      !searchParams.has("limit") ||
      isNaN(Number(searchParams.get("limit")))
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required query parameter: limit" },
        { status: 400 },
      );
    }

    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const providerIdParam = searchParams.get("providerId");
    const providerId = Number(providerIdParam) || undefined;

    const movies = await getMoviesList({ page, limit, providerId });

    return NextResponse.json({ movies }, { status: 200, statusText: "OK" });
  } catch (error) {
    console.error("[API] 영화 조회 에러:", error);
    return NextResponse.json(
      { error: "영화를 가져오는 중 에러가 발생했습니다." },
      { status: 500 },
    );
  }
}
