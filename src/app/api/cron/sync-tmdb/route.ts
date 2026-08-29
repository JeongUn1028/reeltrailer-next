import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

//* 주요 OTT Providers IDs (Netflix: 8, Disney+: 337, Watcha: 97, Wavve: 356, Tving: 1796)
const OTT_PROVIDER_IDS = "8|337|97|356|1796";

//* 날짜 유효성 검사 및 Date 객체 변환 헬퍼 함수
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

//* TMDB에서 장르를 가져오는 헬퍼 함수
export async function syncGenres() {
  try {
    // 1. TMDB 영화 & TV 장르 목록 병렬 요청 (한국어 기준)
    const [movieGenresRes, tvGenresRes] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/genre/movie/list?language=ko-KR&api_key=${TMDB_API_KEY}`,
        { next: { revalidate: 86400 } }, // 24시간 캐싱 (선택 사항)
      ),
      fetch(
        `${TMDB_BASE_URL}/genre/tv/list?language=ko-KR&api_key=${TMDB_API_KEY}`,
        { next: { revalidate: 86400 } },
      ),
    ]);

    if (!movieGenresRes.ok || !tvGenresRes.ok) {
      throw new Error("TMDB 장르 API 요청에 실패했습니다.");
    }

    const movieGenresData: TmdbGenreResponse = await movieGenresRes.json();
    const tvGenresData: TmdbGenreResponse = await tvGenresRes.json();

    // 2. 영화와 TV 장르 배열 합치기 및 ID 기준 중복 제거
    const genreMap = new Map<number, string>();

    [...movieGenresData.genres, ...tvGenresData.genres].forEach((genre) => {
      genreMap.set(genre.id, genre.name);
    });

    const allGenres = Array.from(genreMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    // 3. Prisma 병렬 upsert로 DB에 저장 및 업데이트
    const upsertPromises = allGenres.map((genre) =>
      prisma.genre.upsert({
        where: { id: genre.id },
        update: { name: genre.name },
        create: {
          id: genre.id,
          name: genre.name,
        },
      }),
    );

    await Promise.all(upsertPromises);

    return { success: true, count: allGenres.length };
  } catch (error) {
    console.error("❌ syncGenres 에러:", error);
    throw error;
  }
}

//* TMDB에서 예고편 키를 가져오는 헬퍼 함수
async function fetchTrailerKey(
  type: "movie" | "tv",
  id: number,
): Promise<string | null> {
  const fetchVideos = async (lang: string) => {
    try {
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
    } catch (error) {
      console.error(
        `Error fetching ${type} videos for ID ${id} in ${lang}:`,
        error,
      );
      return [];
    }
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

//* 특정 영화/TV의 한국 Watch Providers(flatrate)를 가져오는 헬퍼 함수 (중복 요청 방지용으로 1회만 호출)
async function fetchKrFlatrateProviders(
  type: "movie" | "tv",
  id: number,
): Promise<TMDBProvider[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return data.results?.KR?.flatrate || [];
}

//* Watch Provider 및 연결 테이블을 upsert하는 공통 헬퍼 함수
async function upsertWatchProviders(
  providers: TMDBProvider[],
  target: { type: "movie" | "tv"; id: number },
) {
  for (const provider of providers) {
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

    if (target.type === "movie") {
      await prisma.moviesOnWatchProviders.upsert({
        where: {
          movieId_providerId: {
            movieId: target.id,
            providerId: provider.provider_id,
          },
        },
        update: {},
        create: {
          movieId: target.id,
          providerId: provider.provider_id,
        },
      });
    } else {
      await prisma.tvShowsOnWatchProviders.upsert({
        where: {
          tvShowId_providerId: {
            tvShowId: target.id,
            providerId: provider.provider_id,
          },
        },
        update: {},
        create: {
          tvShowId: target.id,
          providerId: provider.provider_id,
        },
      });
    }
  }
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
  genre_ids: number[]; // TMDB에서 제공하는 장르 ID 배열
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
  genre_ids: number[]; // TMDB에서 제공하는 장르 ID 배열
}

interface TMDBProvider {
  provider_name: string;
  provider_id: number;
  logo_path: string | null;
  display_priority: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreResponse {
  genres: TmdbGenre[];
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
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&watch_region=KR&with_watch_monetization_types=flatrate&with_watch_providers=${OTT_PROVIDER_IDS}&sort_by=popularity.desc&page=1`,
      { cache: "no-store" },
    );
    const movieData = await moviesRes.json();
    const movies: TMDBMovie[] = movieData.results;

    for (const movie of movies) {
      // 2. Watch Providers는 이 movie에 대해 딱 한 번만 fetch (스킵 여부 확인 + 저장 모두에 재사용)
      const krProviders = await fetchKrFlatrateProviders("movie", movie.id);

      // ⭐️ 핵심: 한국 OTT 목록이 0개라면 Movie DB에 저장하지 않고 바로 패스합니다!
      if (krProviders.length === 0) {
        continue;
      }
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
          genres: {
            deleteMany: {}, // 기존 장르 관계 삭제
            create: movie.genre_ids.map((genreId: number) => ({
              genre: { connect: { id: genreId } },
            })),
          },
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
          genres: {
            create: movie.genre_ids.map((genreId: number) => ({
              genre: { connect: { id: genreId } },
            })),
          },
        },
      });

      // 4. Movie의 Watch Providers 저장 (위에서 이미 가져온 krProviders 재사용)
      await upsertWatchProviders(krProviders, { type: "movie", id: movie.id });
    }

    // -----------------------------------------
    // OTT 전용 TV 프로그램 Fetch
    // (영화 루프 밖으로 이동: 기존에는 영화 개수만큼 TV 목록 전체를 매번 재조회하고
    //  재처리하는 심각한 중복 요청이 있었음)
    // -----------------------------------------
    const tvRes = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&watch_region=KR&with_watch_monetization_types=flatrate&with_watch_providers=${OTT_PROVIDER_IDS}&sort_by=popularity.desc&page=1`,
      { cache: "no-store" },
    );
    const tvData = await tvRes.json();
    const tvShows: TMDBTVShow[] = tvData.results;

    for (const tvShow of tvShows) {
      // Program 별 OTT Providers Fetch (1회만 호출 후 재사용)
      const tvProviders = await fetchKrFlatrateProviders("tv", tvShow.id);
      const trailerKey = await fetchTrailerKey("tv", tvShow.id);

      // 5. TV Show 데이터 Upsert
      await prisma.tvShow.upsert({
        where: { id: tvShow.id },
        update: {
          title: tvShow.name,
          originalTitle: tvShow.original_name,
          overview: tvShow.overview,
          posterPath: tvShow.poster_path,
          backdropPath: tvShow.backdrop_path,
          trailerKey,
          firstAirDate: parseDate(tvShow.first_air_date),
          voteAverage: tvShow.vote_average,
          voteCount: tvShow.vote_count,
          popularity: tvShow.popularity,
          genres: {
            deleteMany: {}, // 기존 장르 관계 삭제
            create: tvShow.genre_ids.map((genreId: number) => ({
              genre: { connect: { id: genreId } },
            })),
          },
        },
        create: {
          id: tvShow.id,
          title: tvShow.name,
          originalTitle: tvShow.original_name,
          overview: tvShow.overview,
          posterPath: tvShow.poster_path,
          backdropPath: tvShow.backdrop_path,
          trailerKey: trailerKey,
          firstAirDate: parseDate(tvShow.first_air_date),
          voteAverage: tvShow.vote_average,
          voteCount: tvShow.vote_count,
          popularity: tvShow.popularity,
          genres: {
            create: tvShow.genre_ids.map((genreId: number) => ({
              genre: { connect: { id: genreId } },
            })),
          },
        },
      });

      // 6. TV Show의 Watch Providers 저장 (위에서 이미 가져온 tvProviders 재사용)
      await upsertWatchProviders(tvProviders, { type: "tv", id: tvShow.id });
    }

    return NextResponse.json({
      success: true,
      syncedMoviesCount: movies.length,
      syncedTvShowsCount: tvShows.length,
      timestamp: new Date().toISOString(),
      message: "TMDB Sync Completed",
    });
  } catch (error) {
    console.error("TMDB Sync Failed:", error);
    return NextResponse.json({ message: "TMDB Sync Failed" }, { status: 500 });
  }
}
