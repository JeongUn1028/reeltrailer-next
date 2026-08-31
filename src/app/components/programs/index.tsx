import Program from "./program";
import styles from "./index.module.css";
import genres from "@/config/genre.json";
import { getProgramsByGenre, getProgramList } from "@/server/contents";
import { ProgramType } from "@/app/types/types";

const getPrograms = async (
  title: string,
  providerId?: string,
): Promise<ProgramType[] | null> => {
  try {
    const parsedProviderId = providerId ? Number(providerId) : undefined;

    if (
      (title === "영화" || title === "프로그램") &&
      parsedProviderId !== undefined
    ) {
      const newTitle = title === "영화" ? "movie" : "tvshow";
      const programs = await getProgramList(parsedProviderId, newTitle, 20, 1);
      return programs;
    }

    const programs = await getProgramsByGenre({
      genreIds: genres.find((genre) => genre.name === title)?.id,
      limit: 20,
      providerIds: parsedProviderId,
    });
    return [...programs.movies, ...programs.tvShows];
  } catch (error) {
    console.error("[Programs Component] Error fetching programs:", error);
    return null;
  }
};

export default async function Programs({
  title,
  providerId,
}: {
  title: string;
  providerId?: string;
}) {
  const programs: Array<ProgramType> | null = await getPrograms(
    title,
    providerId,
  );

  //* 결과가 없으면 null 반환
  if (!programs || programs.length === 0) {
    return null;
  }

  const displayTitle =
    title !== "영화" && title !== "프로그램" ? ` ${title} 장르` : ` ${title}`;

  return (
    <div className={styles.container}>
      <div>
        <div className={styles.title}>
          추천하는
          {displayTitle}
        </div>
      </div>
      <div className={styles.programContainer}>
        {programs?.map((program) => (
          <Program
            key={`${program.mediaType}-${program.id}`}
            props={program}
            title={title}
          />
        ))}
      </div>
    </div>
  );
}
