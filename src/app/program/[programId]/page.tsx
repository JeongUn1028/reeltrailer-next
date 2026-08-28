import ProgramDetail from "@/app/components/programs/programDetail";
import styles from "@/app/components/programs/programDetail.module.css";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { programId } = await params;
  const { kind } = await searchParams;
  return (
    <main className={styles.standalonePage}>
      <ProgramDetail programId={programId} kind={kind} />
    </main>
  );
}
