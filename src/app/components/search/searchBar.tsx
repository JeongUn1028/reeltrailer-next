"use client";
import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";

import styles from "./searchBar.module.css";

// URL의 `q`가 바뀔 때마다 SearchInput을 완전히 새로 마운트하기 위해
// key를 q 값으로 지정한다.
//
// 만약 key 없이 initialSearch prop만 바꾸면, useState(initialSearch)는
// 최초 렌더링 시에만 초기값을 사용하기 때문에 이후 q가 바뀌어도
// input 내부 상태(search)가 갱신되지 않는 버그가 생긴다.
//
// useEffect + setState로 동기화하는 방법도 있지만, 이는 리렌더링을
// 한 번 더 유발하는 "cascading render"를 발생시켜 React 팀이
// 권장하지 않는 방식이다(react-hooks/set-state-in-effect 참고).
// key를 바꿔 컴포넌트를 리마운트하는 것이 더 효율적이고 올바른 해법이다.

export default function SearchBar() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");

  return <SearchInput key={q ?? ""} initialSearch={q ?? ""} />;
}

function SearchInput({ initialSearch }: { initialSearch: string }) {
  const { ott } = useParams<{ ott?: string }>();

  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const onChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const onSubmit = () => {
    const trimmedSearch = search.trim();
    if (!trimmedSearch) return;
    const searchPath = ott
      ? `/${ott}/search?q=${encodeURIComponent(trimmedSearch)}`
      : `/search?q=${encodeURIComponent(trimmedSearch)}`;
    router.push(searchPath);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };
  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="text"
        placeholder="Search..."
        value={search}
        onChange={onChangeSearch}
        onKeyDown={onKeyDown}
      />
      <button className={styles.button} onClick={onSubmit}>
        Search
      </button>
    </div>
  );
}
