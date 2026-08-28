import { NextResponse } from "next/server";
import { getMovies } from "@/server/contents";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const providerIdParam = searchParams.get("providerId");
    const providerId = providerIdParam ? Number(providerIdParam) : undefined;

    if (
      (providerIdParam !== null && !Number.isInteger(providerId)) ||
      (providerId !== undefined && providerId <= 0)
    ) {
      return NextResponse.json(
        { error: "providerId must be a positive integer" },
        { status: 400 },
      );
    }

    const movies = await getMovies({ page, limit, providerId });
    
    return NextResponse.json({ movies }, { status: 200, statusText: "OK" });
  } catch (error) {
    console.error("[API] 영화 조회 에러:", error);
    return NextResponse.json(
      { error: "영화를 가져오는 중 에러가 발생했습니다." },
      { status: 500 },
    );
  }
}
