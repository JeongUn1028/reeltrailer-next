import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProgramDetail from "@/app/components/programs/programDetail";
import styles from "@/app/components/programs/programDetail.module.css";
import { isValidKind } from "@/app/lib/isValidKind";
import { getMovieById, getTvShowById } from "@/server/contents";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ kind?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { programId } = await params;
  const { kind } = await searchParams;

  if (!/^[1-9]\d*$/.test(programId) || !isValidKind(kind)) {
    return { title: "프로그램을 찾을 수 없습니다", robots: { index: false } };
  }

  const program =
    kind === "movie"
      ? await getMovieById(Number(programId))
      : await getTvShowById(Number(programId));

  if (!program) {
    return { title: "프로그램을 찾을 수 없습니다", robots: { index: false } };
  }

  const description =
    program.overview ||
    `${program.title}의 상세 정보와 시청 가능한 OTT를 확인하세요.`;
  const image = program.posterPath
    ? `https://image.tmdb.org/t/p/w780${program.posterPath}`
    : undefined;
  const canonical = `/program/${programId}?kind=${kind}`;

  return {
    title: program.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: kind === "movie" ? "video.movie" : "website",
      locale: "ko_KR",
      title: program.title,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: `${program.title} 포스터` }] : [],
    },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const { kind } = await searchParams;

  if (!isValidKind(kind)) {
    notFound();
  }

  return (
    <main className={styles.standalonePage}>
      <ProgramDetail programId={programId} kind={kind} />
    </main>
  );
}
