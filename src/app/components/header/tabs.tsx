"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./tabs.module.css";

export default function Tabs() {
  const otts = ["All", "Netflix", "Tving", "Disney+", "Watcha", "Wavve"];
  const router = useRouter();
  const pathname = usePathname();

  const getOttPath = (ott: string) =>
    ott === "All" ? "/" : `/${ott.toLowerCase().replace("+", "-plus")}`;

  const activeOtt = otts.find((ott) => getOttPath(ott) === pathname) ?? "All";

  const onClickOtt = (ott: string) => {
    router.push(getOttPath(ott));
  };

  return (
    <div className={styles.container}>
      {otts.map((ott) => (
        <button
          key={ott}
          className={`${styles.item} ${activeOtt === ott ? styles.active : ""}`}
          onClick={() => onClickOtt(ott)}
          aria-pressed={activeOtt === ott}
        >
          <span className={styles.label}>{ott}</span>
        </button>
      ))}
    </div>
  );
}
