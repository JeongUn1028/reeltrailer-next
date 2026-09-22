"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { SearchSuggestion } from "@/app/types/types";
import { ottSlugToProviderId, posterUrl, programHref, releaseYear } from "@/app/lib/programUrls";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/app/lib/recentSearches";
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

const SUGGEST_MIN_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 250;

//* 입력값을 일정 시간 뒤에 반영하는 훅 (자동완성 요청 횟수 제한)
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

async function fetchSuggestions(query: string, providerId?: number) {
  const params = new URLSearchParams({ q: query });
  if (providerId) params.set("providerId", String(providerId));
  const response = await fetch(`/api/search/suggest?${params.toString()}`);
  if (!response.ok) throw new Error("자동완성 요청 실패");
  return (await response.json()) as SearchSuggestion[];
}

function SearchInput({ initialSearch }: { initialSearch: string }) {
  const { ott } = useParams<{ ott?: string }>();
  const providerId = ottSlugToProviderId(ott);
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState(initialSearch);
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(search.trim(), SUGGEST_DEBOUNCE_MS);
  const canSuggest = debouncedSearch.length >= SUGGEST_MIN_LENGTH;

  const { data: suggestions = [] } = useQuery({
    queryKey: ["search-suggest", debouncedSearch, providerId ?? null],
    queryFn: () => fetchSuggestions(debouncedSearch, providerId),
    enabled: isOpen && canSuggest,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previous) => previous,
  });

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const openDropdown = () => {
    setRecent(getRecentSearches());
    setIsOpen(true);
  };

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecent(addRecentSearch(trimmed));
    setIsOpen(false);
    const searchPath = ott
      ? `/${ott}/search?q=${encodeURIComponent(trimmed)}`
      : `/search?q=${encodeURIComponent(trimmed)}`;
    router.push(searchPath);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit(search);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showRecent = search.trim().length === 0 && recent.length > 0;
  const showSuggestions = canSuggest && suggestions.length > 0;
  const showDropdown = isOpen && (showRecent || showSuggestions);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="search"
          placeholder="영화, TV 프로그램 검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <button className={styles.button} type="button" onClick={() => submit(search)}>
          Search
        </button>
      </div>

      {showDropdown && (
        <div className={styles.dropdown} id={listId}>
          {showRecent && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>최근 검색어</span>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setRecent(clearRecentSearches())}
                >
                  전체 삭제
                </button>
              </div>
              <ul className={styles.list}>
                {recent.map((item) => (
                  <li key={item} className={styles.recentItem}>
                    <button
                      type="button"
                      className={styles.recentQuery}
                      onClick={() => submit(item)}
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`"${item}" 최근 검색어 삭제`}
                      onClick={() => setRecent(removeRecentSearch(item))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showSuggestions && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>추천 결과</span>
              </div>
              <ul className={styles.list}>
                {suggestions.map((item) => {
                  const poster = posterUrl(item.posterPath, "w342");
                  const year = releaseYear(item.releaseDate);
                  return (
                    <li key={`${item.mediaType}-${item.id}`}>
                      <Link
                        href={programHref(item.id, item.mediaType)}
                        className={styles.suggestion}
                        onClick={() => {
                          setRecent(addRecentSearch(item.title));
                          setIsOpen(false);
                        }}
                      >
                        {poster ? (
                          <Image
                            src={poster}
                            alt=""
                            width={32}
                            height={48}
                            className={styles.suggestionPoster}
                          />
                        ) : (
                          <span className={styles.suggestionPoster} />
                        )}
                        <span className={styles.suggestionTitle}>{item.title}</span>
                        <span className={styles.suggestionMeta}>
                          {item.mediaType === "movie" ? "영화" : "TV"}
                          {year && ` · ${year}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`${styles.textButton} ${styles.seeAll}`}
                onClick={() => submit(search)}
              >
                &ldquo;{search.trim()}&rdquo; 전체 결과 보기 <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
