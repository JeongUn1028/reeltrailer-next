import Logo from "./logo";
import Tabs from "./tabs";
import styles from "./header.module.css";

export default function Header() {
  return (
    <div className={styles.container}>
      <Logo />
      <Tabs />
    </div>
  );
}
