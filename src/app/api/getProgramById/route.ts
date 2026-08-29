import { NextRequest } from "next/server";
import { getMovieById } from "@/server/contents";
import { getTvShowById } from "@/server/contents";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParams = searchParams.get("id");
    const programId = Number(idParams);
    if (isNaN(programId)) {
      return new Response("ID parameter is invalid", { status: 400 });
    }
    const programKind = searchParams.get("kind");
    if (!idParams) {
      return new Response("ID parameter is missing", { status: 400 });
    }
    if (!programKind) {
      return new Response("Kind parameter is missing", { status: 400 });
    }
    // Fetch the program by ID from your data source
    if (programKind === "movie") {
      const program = await getMovieById(programId);
      if (!program) {
        return new Response("Program not found", { status: 404 });
      }
      return new Response(JSON.stringify(program), { status: 200 });
    } else if (programKind === "tvshow") {
      const program = await getTvShowById(programId);
      if (!program) {
        return new Response("Program not found", { status: 404 });
      }
      return new Response(JSON.stringify(program), { status: 200 });
    }

    return new Response("Kind parameter is invalid", { status: 400 });
  } catch (error) {
    return new Response(
      "Internal Server Error" +
        (error instanceof Error ? `: ${error.message}` : ""),
      { status: 500 },
    );
  }
}
