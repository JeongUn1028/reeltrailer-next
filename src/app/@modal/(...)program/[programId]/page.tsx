import ProgramDetail from "@/app/components/programs/programDetail";
import Modal from "@/app/components/modal/modal";
import { isValidKind } from "@/app/lib/isVaildKind";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { programId } = await params;
  const { kind } = await searchParams;
  if (!isValidKind(kind)) {
    return <div>잘못된 접근입니다.</div>;
  }
  return (
    <Modal>
      <ProgramDetail programId={programId} kind={kind} />
    </Modal>
  );
}
