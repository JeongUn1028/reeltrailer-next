import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

//* 주요 OTT Providers IDs (Netflix: 8, Disney+: 337, Watcha: 97, Wavve: 356, Tving: 1796)
const OTT_PROVIDERS_IDS = "8|337|97|356|1796";

// 날짜 유효성 검사 및 Date 객체 변환 헬퍼 함수
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

async function fetchTrailerKey(
  type: "movie" | "tv",
  id: number,
): Promise<string | null> {
  const fetchVideos = async (lang: string) => {
    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/videos?api_key=${TMDB_API_KEY}&language=${lang}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.error(`Failed to fetch ${type} videos for ID ${id} in ${lang}`);
      return [];
    }
    const data = await res.json();
    return data.results || [];
  };
  // 1. 한국어 예고편 조회
  let videos = await fetchVideos("ko-KR");
  let trailer = videos.find(
    (v: { site: string; type: string }) =>
      v.site === "YouTube" && v.type === "Trailer",
  );

  // 2. 한국어 예고편이 없으면 영어 예고편 조회
  if (!trailer) {
    videos = await fetchVideos("en-US");
    trailer = videos.find(
      (v: { site: string; type: string }) =>
        v.site === "YouTube" && v.type === "Trailer",
    );
  }

  // 3. Official Trailer 우선, 없으면 첫 번째 YouTube 영상 선택
  return trailer ? trailer.key : (videos[0]?.key ?? null);
}

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

interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
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
    // -----------------------------------------
    //  TMDB 인기 영화 목록 Fetch
    // -----------------------------------------
    const moviesRes = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=ko-KR&page=1`,
      { cache: "no-store" },
    );
    const movieData = await moviesRes.json();
    const movies: TMDBMovie[] = movieData.results;

    for (const movie of movies) {
      const trailerKey = await fetchTrailerKey("movie", movie.id);
      // 3. Movie 데이터 Upsert
      await prisma.movie.upsert({
        where: { id: movie.id },
        update: {
          title: movie.title,
          originalTitle: movie.original_title,
          overview: movie.overview,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          trailerKey,
          releaseDate: parseDate(movie.release_date),
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
          trailerKey,
          releaseDate: parseDate(movie.release_date),
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          popularity: movie.popularity,
        },
      });

      // 4. Movie의 Watch Providers Fetch
      const providersRes = await fetch(
        `${TMDB_BASE_URL}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`,
        { cache: "no-store" },
      );
      const providersData = await providersRes.json();
      const providers: TMDBProvider[] =
        providersData.results?.KR?.flatrate || [];

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

      // -----------------------------------------
      // OTT 전용 TV 프로그램 Fetch
      // -----------------------------------------

      const tvRes = await fetch(
        `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&watch_region=KR&with_watch_monetization_types=flatrate&with_watch_providers=${OTT_PROVIDERS_IDS}&sort_by=popularity.desc&page=1`,
        { cache: "no-store" },
      );
      const tvData = await tvRes.json();
      const tvShows: TMDBTVShow[] = tvData.results;

      for (const tvShow of tvShows) {
        const trailerKey = await fetchTrailerKey("tv", tvShow.id);
        // 6. TV Show 데이터 Upsert

        await prisma.tvShow.upsert({
          where: { id: tvShow.id },
          update: {
            name: tvShow.name,
            originalName: tvShow.original_name,
            overview: tvShow.overview,
            posterPath: tvShow.poster_path,
            backdropPath: tvShow.backdrop_path,
            trailerKey,
            firstAirDate: parseDate(tvShow.first_air_date),
            voteAverage: tvShow.vote_average,
            voteCount: tvShow.vote_count,
            popularity: tvShow.popularity,
          },
          create: {
            id: tvShow.id,
            name: tvShow.name,
            originalName: tvShow.original_name,
            overview: tvShow.overview,
            posterPath: tvShow.poster_path,
            backdropPath: tvShow.backdrop_path,
            trailerKey: trailerKey,
            firstAirDate: parseDate(tvShow.first_air_date),
            voteAverage: tvShow.vote_average,
            voteCount: tvShow.vote_count,
            popularity: tvShow.popularity,
          },
        });

        // Program 별 OTT Providers Fetch
        const tvProvidersRes = await fetch(
          `${TMDB_BASE_URL}/tv/${tvShow.id}/watch/providers?api_key=${TMDB_API_KEY}`,
          { cache: "no-store" },
        );
        const tvProvidersData = await tvProvidersRes.json();
        const tvProviders: TMDBProvider[] =
          tvProvidersData.results?.KR?.flatrate || [];

        for (const provider of tvProviders) {
          // 7. Provider 데이터 Upsert
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

          await prisma.tvShowsOnWatchProviders.upsert({
            where: {
              tvShowId_providerId: {
                tvShowId: tvShow.id,
                providerId: provider.provider_id,
              },
            },
            update: {},
            create: {
              tvShowId: tvShow.id,
              providerId: provider.provider_id,
            },
          });
        }
      }
    }
    return NextResponse.json({
      success: true,
      syncedMoviesCount: movies.length,
      timestamp: new Date().toISOString(),
      message: "TMDB Sync Completed",
    });
  } catch (error) {
    console.error("TMDB Sync Failed:", error);
    return NextResponse.json({ message: "TMDB Sync Failed" }, { status: 500 });
  }
}
