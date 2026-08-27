import prisma from "@/server/prisma";
import { Prisma } from "@prisma/client";

export type MovieWithProviders = Prisma.MovieGetPayload<{
  include: {
    providers: {
      include: {
        provider: true;
      };
    };
  };
}>;

export type TVShowWithProviders = Prisma.TvShowGetPayload<{
  include: {
    providers: {
      include: {
        provider: true;
      };
    };
  };
}>;

export interface GetContentsParams {
  providerId?: number;
  limit?: number;
  page?: number;
}

// 영화 목록 조회
export async function getMovies({
  providerId,
  limit = 20,
  page = 1,
}: GetContentsParams = {}): Promise<MovieWithProviders[]> {
  const skip = (page - 1) * limit;

  const movies = await prisma.movie.findMany({
    where: providerId ? { providers: { some: { providerId } } } : {},
    include: {
      providers: {
        where: providerId ? { providerId } : undefined,
        include: {
          provider: true,
        },
      },
    },
    orderBy: {
      popularity: "desc",
    },
    take: limit,
    skip,
  });
  return movies;
}

// TV 프로그램 목록 조회
export async function getTVShows({
  providerId,
  limit = 20,
  page = 1,
}: GetContentsParams = {}): Promise<TVShowWithProviders[]> {
  const skip = (page - 1) * limit;
  const tvShows = await prisma.tvShow.findMany({
    where: providerId ? { providers: { some: { providerId } } } : {},
    include: {
      providers: {
        include: {
          provider: true,
        },
      },
    },
    orderBy: {
      popularity: "desc",
    },
    take: limit,
    skip,
  });
  return tvShows;
}

//특정 영화 상세 조회
export async function getMovieById(
  id: number,
): Promise<MovieWithProviders | null> {
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      providers: {
        include: {
          provider: true,
        },
      },
    },
  });
  return movie;
}

//특정 TV 프로그램 상세 조회
export async function getTVShowById(
  id: number,
): Promise<TVShowWithProviders | null> {
  const tvShow = await prisma.tvShow.findUnique({
    where: { id },
    include: {
      providers: {
        include: {
          provider: true,
        },
      },
    },
  });
  return tvShow;
}

//검색
export async function searchPrograms(query: string) {
  //* 검색어가 없거나 공백인 경우
  if (!query || query.trim() === "") {
    return { programs: [] };
  }

  const [movies, tvShows] = await Promise.all([
    prisma.movie.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        providers: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        popularity: "desc",
      },
      take: 20,
    }),
    prisma.tvShow.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        providers: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        popularity: "desc",
      },
      take: 20,
    }),
  ]);
  const programs = [...movies, ...tvShows];
  return { programs };
}
