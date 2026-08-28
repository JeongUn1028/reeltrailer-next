//TODO logic 분리 필요

import Program from "./program";
import styles from "./index.module.css";
import type { ProgramType } from "@/app/types/types";

export default async function Programs({
  title,
  providerId,
}: {
  title: string;
  providerId?: string;
}) {
  let programs: ProgramType[] = [];
  const providerQuery = providerId ? `&providerId=${providerId}` : "";

  if (title === "영화") {
    const popularmoviess = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/getMovies?page=1&limit=20${providerQuery}`,
    );
    if (!popularmoviess.ok) {
      throw new Error("Failed to fetch popular movies");
    }
    const moviePrograms = await popularmoviess.json();
    programs = moviePrograms.movies;
  } else if (title === "프로그램") {
    const popularTvShows = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/getTvShows?page=1&limit=20${providerQuery}`,
    );
    if (!popularTvShows.ok) {
      throw new Error("Failed to fetch popular TV shows");
    }
    const tvShowPrograms = await popularTvShows.json();
    programs = tvShowPrograms.tvShows;
  } else {
    const genrePrograms = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/getProgramsByGenre?genre=${encodeURIComponent(title)}&page=1&limit=20${providerQuery}`,
    );
    if (!genrePrograms.ok) {
      throw new Error(`Failed to fetch programs for genre: ${title}`);
    }
    const genreProgramsJson = await genrePrograms.json();
    const genreProgramsData = genreProgramsJson.programs;
    programs = genreProgramsData.movies.concat(genreProgramsData.tvShows);
  }

  if (programs.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div>
        <div className={styles.title}>
          추천하는
          {title !== "영화" && title !== "프로그램"
            ? ` ${title} 장르`
            : ` ${title}`}
        </div>
      </div>
      <div className={styles.programContainer}>
        {programs.map((program) => (
          <Program key={program.id} props={program} title={title} />
        ))}
      </div>
    </div>
  );
}
