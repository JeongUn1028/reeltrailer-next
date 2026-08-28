import styles from "../page.module.css";
import CarouselContainer from "../../components/carousel";
import RecommendSection from "../../components/programs/recommendSection";
import providerIds from "@/config/ott-provider-ids.json";

//* 추천하는 00 이 영역을 분리 하고,

export default async function Home({
  params,
}: {
  params: Promise<{ ott: string }>;
}) {
  const { ott } = await params;
  const providerId = providerIds[ott as keyof typeof providerIds];

  return (
    <div className={styles.container}>
      <CarouselContainer />
      <RecommendSection providerId={providerId} />
    </div>
  );
}
