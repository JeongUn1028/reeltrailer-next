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
