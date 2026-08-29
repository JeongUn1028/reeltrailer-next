import Link from "next/link";
import ProgramDetail from "@/app/components/programs/programDetail";
import Modal from "@/app/components/modal/modal";
import { isValidKind } from "@/app/lib/isVaildKind";
import styles from "./page.module.css";

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
    return (
      <Modal>
        <section
          className={styles.invalidRequest}
          aria-labelledby="invalid-title"
        >
          <p className={styles.errorLabel}>INVALID REQUEST</p>
          <h1 id="invalid-title">콘텐츠 정보를 불러올 수 없습니다</h1>
          <p>
            올바르지 않은 콘텐츠 유형으로 요청되었습니다. 목록에서 콘텐츠를 다시
            선택해 주세요.
          </p>
          <Link className={styles.homeLink} href="/">
            홈으로 이동
          </Link>
        </section>
      </Modal>
    );
  }
  return (
    <Modal>
      <ProgramDetail programId={programId} kind={kind} />
    </Modal>
  );
}
