"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./tabs.module.css";

const OTTS = ["All", "Netflix", "Tving", "Disney+", "Watcha", "Wavve"] as const;

const getOttPath = (ott: string) =>
  ott === "All" ? "/" : `/${ott.toLowerCase().replace("+", "-plus")}`;

//* 상단 OTT 탭. <Link>라 prefetch·새 탭 열기·크롤링이 모두 동작한다.
export default function Tabs() {
  const pathname = usePathname();

  const activeOtt =
    OTTS.find((ott) => {
      const ottPath = getOttPath(ott);
      return (
        ottPath === pathname ||
        (ottPath !== "/" && pathname.startsWith(`${ottPath}/`))
      );
    }) ?? "All";

  return (
    <nav className={styles.container} aria-label="OTT 선택">
      {OTTS.map((ott) => {
        const isActive = activeOtt === ott;
        return (
          <Link
            key={ott}
            href={getOttPath(ott)}
            className={`${styles.item} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.label}>{ott}</span>
          </Link>
        );
      })}
    </nav>
  );
}
