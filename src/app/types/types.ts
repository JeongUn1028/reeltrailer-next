export interface Provider {
  id: number;
  providerId?: number; // ⭐️ 필수에서 선택적(?), 또는 삭제
  providerName: string;
  logoPath: string | null;
  displayPriority?: number;
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
  id: number;
  mediaType?: ProgramMediaType;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey?: string | null;
  releaseDate?: Date | null | undefined;
  firstAirDate?: Date | null;
  voteAverage: number;
  popularity: number;
  providers: Provider[];
  genres: Genre[];
}

export interface ProgramsByGenre {
  movies: ProgramType[];
  tvShows: ProgramType[];
}
