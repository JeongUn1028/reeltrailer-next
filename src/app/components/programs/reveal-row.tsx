import type { ReactNode } from "react";
import styles from "./reveal-row.module.css";

type RevealRowProps = {
  children: ReactNode;
  /** true면 애니메이션 없이 항상 표시 (첫 화면에 보이는 행) */
  eager?: boolean;
};

//* 서버가 그린 행을 그대로 HTML에 포함시키되(SEO/hydration 유지),
//* 화면 아래에 있는 행은 뷰포트에 들어올 때 떠오르며 등장하도록 한다.
//*
//* JS 없이 CSS 스크롤 기반 애니메이션(animation-timeline: view())만 사용한다.
//* IntersectionObserver 방식은 빠르게 스크롤해 지나친 행이 콜백을 못 받아 숨겨진 채 남는 문제가 있었다.
//* view() 타임라인은 위치에서 진행도를 계산하므로 지나친 행은 자동으로 끝 상태(표시)가 된다.
//* 미지원 브라우저에서는 애니메이션 없이 바로 보인다.
//* 화면 밖 행의 렌더링 비용은 CSS content-visibility가 건너뛴다.
export default function RevealRow({ children, eager = false }: RevealRowProps) {
  return (
    <div className={eager ? styles.row : `${styles.row} ${styles.animated}`}>
      {children}
    </div>
  );
}
