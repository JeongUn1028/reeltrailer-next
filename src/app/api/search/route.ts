import { NextResponse } from "next/server";
import { searchPrograms } from "@/server/contents";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const results = await searchPrograms(query);
  return NextResponse.json(results);
}
