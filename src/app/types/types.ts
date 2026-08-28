export interface ProviderDetails {
  createdAt: string;
  displayPriority: number;
  id: number;
  logoPath: string;
  providerName: string;
  updatedAt: string;
}
export interface Provider {
  movieId: number;
  providerId: number;
  provider: ProviderDetails;
}

export interface GenreDetails {
  id: number;
  name: string;
}

export interface Genre {
  id: number;
  name: string;
  genre: GenreDetails;
}

export type ProgramMediaType = "movie" | "tvshow";

export interface ProgramType {
  id: number;
  mediaType?: ProgramMediaType;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey?: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  popularity: number;
  providers: Provider[];
  genres: Genre[];
}
