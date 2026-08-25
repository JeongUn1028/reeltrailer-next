export interface ProgramType {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey?: string;
  releaseDate: string;
  voteAverage: number;
  popularity: number;
}
