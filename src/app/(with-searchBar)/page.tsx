import CarouselContainer from "../components/carousel";
import Programs from "../components/programs";
import styles from "./page.module.css";

export default async function Home() {
  const popularPrograms = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/getMovies?page=1&limit=20`,
  );
  if (!popularPrograms.ok) {
    throw new Error("Failed to fetch popular programs");
  }
  const popularProgramsData = await popularPrograms.json();

  return (
    <div className={styles.container}>
      <CarouselContainer />
      <Programs programs={popularProgramsData.movies} />
    </div>
  );
}
