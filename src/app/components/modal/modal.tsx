"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useRef, useEffect, useSyncExternalStore } from "react";
import styles from "./modal.module.css";

// SSR 및 Hydration 안전성을 위한 Client Check 훅
// hydration 안전성을 위해 클라이언트에서만 렌더링되도록 체크
const subscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export default function Modal({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    const dialogNode = dialogRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (dialogNode && !dialogNode.open) {
      dialogNode.showModal();
      dialogNode.scrollTo({ top: 0, left: 0 });
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  // 1. SSR 시점이나 아직 마운트되지 않은 경우 null 반환
  if (!isClient) return null;

  // 2. modal-root 타겟 안전하게 가져오기 (fallback: document.body)
  const modalRoot = document.getElementById("modal-root") ?? document.body;

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={() => {
        router.back();
      }}
      onClick={(e) => {
        // 백드롭(Backdrop) 영역 클릭 시 닫기
        if (e.target === dialogRef.current) {
          router.back();
        }
      }}
    >
      {/* 스크롤해도 항상 보이는 닫기 버튼. 높이 0인 sticky 래퍼라 콘텐츠 레이아웃에 영향을 주지 않는다 */}
      <div className={styles.closeBar}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => router.back()}
          aria-label="닫기"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {children}
    </dialog>,
    modalRoot,
  );
}
