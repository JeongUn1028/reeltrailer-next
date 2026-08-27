import CarouselContainer from "../../components/carousel";
import Programs from "../../components/programs";
import styles from "../page.module.css";
import constants from "../../../config/ott-provider-ids.json";

export default async function Page({
  params,
}: {
  params: Promise<{ ott: string }>;
}) {
  const { ott } = await params;
  const ottName = ott as keyof typeof constants;
  const providerId = constants[ottName];

  if (providerId === undefined) {
    throw new Error(`Unsupported OTT value: ${ott}`);
  }

  const popularPrograms = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/getMovies?page=1&limit=20&providerId=${providerId}`,
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
