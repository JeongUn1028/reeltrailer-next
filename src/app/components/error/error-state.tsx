"use client";

import Link from "next/link";
import styles from "./error-state.module.css";

type ErrorStateProps = {
  /** 상단 작은 라벨 (예: "REELTRAILER / ERROR") */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Next.js error boundary가 넘겨주는 error.digest (서버 로그와 대조용) */
  digest?: string;
  /** "다시 시도" 버튼 핸들러. 없으면 버튼을 렌더링하지 않음 */
  onRetry?: () => void;
  /** 홈으로 이동 링크 표시 여부 */
  showHomeLink?: boolean;
  /** 섹션 안에 들어가는 컴팩트 형태 */
  variant?: "page" | "inline";
};

//* 에러 화면 공통 UI. error.tsx, ErrorBoundary fallback 등에서 재사용
export default function ErrorState({
  eyebrow = "REELTRAILER / ERROR",
  title,
  description,
  digest,
  onRetry,
  showHomeLink = true,
  variant = "page",
}: ErrorStateProps) {
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <section
      className={variant === "page" ? styles.page : styles.inline}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <Heading>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
        {digest && <p className={styles.digest}>ref: {digest}</p>}
        <div className={styles.actions}>
          {onRetry && (
            <button type="button" className={styles.button} onClick={onRetry}>
              다시 시도
            </button>
          )}
          {showHomeLink && (
            <Link className={styles.link} href="/">
              홈으로 돌아가기
              <span aria-hidden="true">-&gt;</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
