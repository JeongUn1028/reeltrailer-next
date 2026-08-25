import { NextResponse } from "next/server";
import { getMovies } from "@/server/contents";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  const movies = await getMovies({ page, limit });
  return NextResponse.json({ movies });
}
