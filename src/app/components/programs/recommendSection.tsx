import genres from "../../../config/genre.json";
import Programs from "./index";

export default function RecommendSection({
  providerId,
}: {
  providerId?: string;
}) {
  const recommendedName = [
    "영화",
    "프로그램",
    ...genres.map((genre) => genre.name),
  ];
  return (
    <>
      {recommendedName.map((name) => (
        <Programs key={name} title={name} providerId={providerId} />
      ))}
    </>
  );
}
