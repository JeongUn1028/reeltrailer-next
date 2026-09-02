import { NextResponse } from "next/server";
import { getTvShowsList } from "@/server/contents";

export async function GET(request: Request) {
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

  const tvShows = await getTvShowsList({ page, limit, providerId });
  return NextResponse.json({ tvShows });
}
