"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function ModalCloseButton() {
  const router = useRouter();

  return (
    <button
      aria-label="모달 닫기"
      className={styles.closeButton}
      onClick={() => router.back()}
      type="button"
    >
      <span aria-hidden="true">x</span>
    </button>
  );
}
