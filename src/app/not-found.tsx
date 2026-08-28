import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>REELTRAILER / ERROR 404</p>
        <p className={styles.code}>404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className={styles.description}>
          요청하신 콘텐츠가 삭제되었거나, 주소가 변경되었을 수 있습니다.
        </p>
        <Link className={styles.homeLink} href="/">
          홈으로 돌아가기
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </main>
  );
}
