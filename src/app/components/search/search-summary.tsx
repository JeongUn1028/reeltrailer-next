import styles from "./search-summary.module.css";

type SearchSummaryProps = {
  query: string;
  total: number;
  fuzzy: boolean;
};

//* 검색 결과 건수와, 유사 검색으로 대체된 경우의 안내
export default function SearchSummary({ query, total, fuzzy }: SearchSummaryProps) {
  return (
    <>
      <span className={styles.count}>{total.toLocaleString()}편</span>
      {fuzzy && (
        <p className={styles.fuzzy} role="status">
          &ldquo;{query}&rdquo;와 정확히 일치하는 결과가 없어 비슷한 제목을 보여드립니다.
        </p>
      )}
    </>
  );
}
