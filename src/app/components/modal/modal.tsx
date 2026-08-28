"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useRef, useEffect } from "react";

export default function Modal({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
      dialogRef.current?.scrollTo({ top: 0, left: 0 });
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={() => {
        router.back();
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === "DIALOG") {
          router.back();
        }
      }}
    >
      {children}
    </dialog>,
    document.getElementById("modal-root") as HTMLElement,
  );
}
