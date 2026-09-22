import Modal from "@/app/components/modal/modal";
import ProgramDetailSkeleton from "@/app/components/skeleton/program-detail-skeleton";

export default function Loading() {
  return (
    <Modal>
      <ProgramDetailSkeleton />
    </Modal>
  );
}
