import { NextRequest, NextResponse } from "next/server";
import genres from "@/config/genre.json";
import { getProgramsByGenre } from "@/server/contents";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genreParam = searchParams.get("genre");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const providerIdParam = searchParams.get("providerId");
    const providerId = providerIdParam ? Number(providerIdParam) : undefined;

    // 파라미터 유효성 검사
    if (!genreParam) {
      return NextResponse.json(
        { message: "genre 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    if (
      (providerIdParam !== null && !Number.isInteger(providerId)) ||
      (providerId !== undefined && providerId <= 0)
    ) {
      return NextResponse.json(
        { message: "providerId는 양의 정수여야 합니다." },
        { status: 400 },
      );
    }

    console.log(`Fetching programs for genre: ${genreParam}`);
    const genreIds = genres.find((genre) => genre.name === genreParam)?.id;
    console.log(`Resolved genre IDs for ${genreParam}: ${genreIds}`);
    if (!genreIds) {
      return NextResponse.json(
        { message: "유효한 장르명을 입력해 주세요." },
        { status: 400 },
      );
    }

    // Server 쿼리 모듈 호출
    const result = await getProgramsByGenre({
      genreIds,
      providerIds: providerId,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] 장르별 조회 에러:", error);
    return NextResponse.json(
      { message: "장르별 콘텐츠를 가져오는 중 에러가 발생했습니다." },
      { status: 500 },
    );
  }
}
