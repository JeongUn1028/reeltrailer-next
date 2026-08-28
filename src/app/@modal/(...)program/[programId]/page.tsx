import ProgramDetail from "@/app/components/programs/programDetail";
import Modal from "@/app/components/modal/modal";

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
    <Modal>
      <ProgramDetail programId={programId} kind={kind} />
    </Modal>
  );
}
