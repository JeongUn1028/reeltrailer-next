import SearchBar from "../components/search/searchBar";
import styles from "./layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <SearchBar />
      </div>
      <div className={styles.container}>{children}</div>
    </div>
  );
}
