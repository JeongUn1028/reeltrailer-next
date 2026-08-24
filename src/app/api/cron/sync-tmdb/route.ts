import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// 날짜 유효성 검사 및 Date 객체 변환 헬퍼 함수
const parseReleseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

interface TMDBProvider {
  provider_name: string;
  provider_id: number;
  logo_path: string | null;
  display_priority: number;
}

export async function GET(request: Request) {
  //* 1. Vercel Cron Security Key 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { message: "TMDB API Key is not set" },
      { status: 500 },
    );
  }

  try {
    // 2. TMDB 인기 영화 목록 Fetch
    const popularRes = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=ko-KR&page=1`,
    );
    const popularData = await popularRes.json();
    const popularMovies: TMDBMovie[] = popularData.results;

    for (const movie of popularMovies) {
      // 3. 각 영화별 Watch Providers (OTT) Fetch
      const releaseDate = parseReleseDate(movie.release_date);

      const providersRes = await fetch(
        `${TMDB_BASE_URL}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`,
        { cache: "no-store" },
      );
      const providersData = await providersRes.json();
      const providers: TMDBProvider[] =
        providersData.results?.KR?.flatrate || [];

      // 4. Movie 데이터 Upsert
      await prisma.movie.upsert({
        where: { id: movie.id },
        update: {
          title: movie.title,
          originalTitle: movie.original_title,
          overview: movie.overview,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          releaseDate: releaseDate,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          popularity: movie.popularity,
        },
        create: {
          id: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          overview: movie.overview,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          releaseDate: releaseDate,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          popularity: movie.popularity,
        },
      });

      for (const provider of providers) {
        // 5. Provider 데이터 Upsert
        await prisma.watchProvider.upsert({
          where: { id: provider.provider_id },
          update: {
            providerName: provider.provider_name,
            logoPath: provider.logo_path,
            displayPriority: provider.display_priority,
          },
          create: {
            id: provider.provider_id,
            providerName: provider.provider_name,
            logoPath: provider.logo_path,
            displayPriority: provider.display_priority,
          },
        });

        await prisma.moviesOnWatchProviders.upsert({
          where: {
            movieId_providerId: {
              movieId: movie.id,
              providerId: provider.provider_id,
            },
          },
          update: {},
          create: {
            movieId: movie.id,
            providerId: provider.provider_id,
          },
        });
      }
    }
    return NextResponse.json({
      success: true,
      syncedMoviesCount: popularMovies.length,
      timestamp: new Date().toISOString(),
      message: "TMDB Sync Completed",
    });
  } catch (error) {
    console.error("TMDB Sync Failed:", error);
    return NextResponse.json({ message: "TMDB Sync Failed" }, { status: 500 });
  }
}
