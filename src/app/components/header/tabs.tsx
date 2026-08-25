"use client";

import { useState } from "react";
import styles from "./tabs.module.css";

export default function Tabs() {
  const Otts = ["All", "Netflix", "Tving", "Disney+", "Whatcha", "Wavve"];
  const [activeOtt, setActiveOtt] = useState("All");

  return (
    <div className={styles.container}>
      {Otts.map((ott) => (
        <button
          key={ott}
          type="button"
          className={`${styles.item} ${activeOtt === ott ? styles.active : ""}`}
          onClick={() => setActiveOtt(ott)}
          aria-pressed={activeOtt === ott}
        >
          <span className={styles.label}>{ott}</span>
        </button>
      ))}
    </div>
  );
}
