import styles from "./searchBar.module.css";

export default function SearchBar() {
  return (
    <div className={styles.container}>
      <input className={styles.input} type="text" placeholder="Search..." />
      <button className={styles.button} type="button">
        Search
      </button>
    </div>
  );
}
