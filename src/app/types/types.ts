export interface Provider {
  id: number;
  providerName: string;
  logoPath: string | null;
  displayPriority?: number;
  updatedAt?: Date | null;
  createdAt?: Date | null;
}

export interface GenreDetails {
  id: number;
  name: string;
}

export interface Genre {
  id: number;
  name: string;
  genre?: GenreDetails;
}

export type ProgramMediaType = "movie" | "tvshow";

export interface ProgramType {
  id?: number;
  mediaType?: ProgramMediaType;
  title?: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  trailerKey?: string | null;
  releaseDate?: Date | null | undefined | string;
  firstAirDate?: Date | null | undefined | string;
  voteAverage?: number;
  popularity?: number;
  providers?: Provider[];
  genres?: GenreDetails[] | null;
}

export interface ProgramsByGenre {
  movies: ProgramType[];
  tvShows: ProgramType[];
}
