import { Suspense } from "react";
import SearchBar from "../components/search/searchBar";
import SearchBarSkeleton from "../components/skeleton/search-bar-skeleton";
import styles from "./layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <Suspense fallback={<SearchBarSkeleton />}>
          <SearchBar />
        </Suspense>
      </div>
      <div className={styles.container}>{children}</div>
    </div>
  );
}
