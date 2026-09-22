"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import styles from "./filter-bar.module.css";

type FilterChipProps = {
  href: string;
  active: boolean;
  children: ReactNode;
};

//* 필터 칩. 클릭 후 서버 응답을 기다리는 동안 data-pending으로 표시한다.
export default function FilterChip({ href, active, children }: FilterChipProps) {
  return (
    <Link
      href={href}
      className={`${styles.chip} ${active ? styles.active : ""}`}
      aria-current={active ? "true" : undefined}
      scroll={false}
    >
      <ChipLabel>{children}</ChipLabel>
    </Link>
  );
}

//* useLinkStatus는 Link의 자식에서만 동작한다
function ChipLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending || undefined}>{children}</span>;
}
