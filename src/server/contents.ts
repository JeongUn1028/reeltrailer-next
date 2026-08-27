import prisma from "@/server/prisma";
import { Prisma } from "@prisma/client";

//* 영화와 TV 프로그램의 정보를 가져오는 서버 측 함수들을 정의하는 파일

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

//* 영화 목록 조회
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
      genres: {
        include: {
          genre: true,
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

//* TV 프로그램 목록 조회
export async function getTvShows({
  providerId,
  limit = 20,
  page = 1,
}: GetContentsParams = {}): Promise<TVShowWithProviders[]> {
  const skip = (page - 1) * limit;
  const tvShows = await prisma.tvShow.findMany({
    where: providerId ? { providers: { some: { providerId } } } : {},
    include: {
      providers: {
        where: providerId ? { providerId } : undefined,
        include: {
          provider: true,
        },
      },
      genres: {
        include: {
          genre: true,
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

//* 특정 영화 상세 조회
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
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });
  return movie;
}

//* 특정 TV 프로그램 상세 조회
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
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });
  return tvShow;
}

//* 검색
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
          genres: {
            include: {
              genre: true,
            },
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
          genres: {
            include: {
              genre: true,
            },
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

//* 장르 별 영화 및 TV 프로그램 조회

// 1. Prisma Payload 타입 정의
type MovieWithRelations = Prisma.MovieGetPayload<{
  include: {
    providers: { include: { provider: true } };
    genres: { include: { genre: true } };
  };
}>;

type TvShowWithRelations = Prisma.TvShowGetPayload<{
  include: {
    providers: { include: { provider: true } };
    genres: { include: { genre: true } };
  };
}>;

type ProgramWithRelations = MovieWithRelations | TvShowWithRelations;

// 2. Options 인터페이스 개선 (단일/배열 모두 지원)
interface GetProgramsByGenreOptions {
  genreIds?: number | number[];
  providerIds?: number | number[];
  limit?: number;
}

export async function getProgramsByGenre({
  genreIds,
  providerIds,
  limit = 20,
}: GetProgramsByGenreOptions) {
  // 배열 유틸리티: 단일 값을 배열로 표준화
  const normalizeArray = (value?: number | number[]) => {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  };

  const formattedGenreIds = normalizeArray(genreIds);
  const formattedProviderIds = normalizeArray(providerIds);

  if (formattedGenreIds.length === 0) {
    return { programs: [], totalCount: 0 };
  }

  // 3. Movie 동적 Where 조건 생성
  const movieWhere: Prisma.MovieWhereInput = {
    genres: {
      some: {
        genreId: { in: formattedGenreIds },
      },
    },
  };

  if (formattedProviderIds.length > 0) {
    movieWhere.providers = {
      some: {
        providerId: { in: formattedProviderIds },
      },
    };
  }

  // 4. TvShow 동적 Where 조건 생성
  const tvShowWhere: Prisma.TvShowWhereInput = {
    genres: {
      some: {
        genreId: { in: formattedGenreIds },
      },
    },
  };

  if (formattedProviderIds.length > 0) {
    tvShowWhere.providers = {
      some: {
        providerId: { in: formattedProviderIds },
      },
    };
  }

  // 5. 영화 & TV 프로그램 병렬 조회
  const [movies, tvShows] = await Promise.all([
    prisma.movie.findMany({
      where: movieWhere,
      include: {
        providers: { include: { provider: true } },
        genres: { include: { genre: true } },
      },
      orderBy: { popularity: "desc" },
      take: limit,
    }),
    prisma.tvShow.findMany({
      where: tvShowWhere,
      include: {
        providers: { include: { provider: true } },
        genres: { include: { genre: true } },
      },
      orderBy: { popularity: "desc" },
      take: limit,
    }),
  ]);

  // 6. 중계 테이블 구조 Flat하게 가공 (genres & providers)
  const formatRelations = <T extends ProgramWithRelations>(items: T[]) =>
    items.map((item) => ({
      ...item,
      genres: item.genres?.map((g) => g.genre) || [],
      providers: item.providers?.map((p) => p.provider) || [],
    }));

  // 7. 통합 후 인기순 정렬 및 최종 limit 자르기
  const combinedPrograms = [
    ...formatRelations(movies),
    ...formatRelations(tvShows),
  ].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const programs = combinedPrograms.slice(0, limit);

  return {
    programs,
    totalCount: programs.length,
  };
}
