"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { SearchSuggestion } from "@/app/types/types";
import { ottSlugToProviderId, posterUrl, programHref, releaseYear } from "@/app/lib/programUrls";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/app/lib/recentSearches";
import ProviderBadges from "@/app/components/programs/provider-badges";
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
  const pathname = usePathname();
  const q = searchParams.get("q");
  // 검색 결과 페이지에서는 바로 다시 검색할 수 있도록 자동 포커스
  const autoFocus = pathname.endsWith("/search");

  return <SearchInput key={q ?? ""} initialSearch={q ?? ""} autoFocus={autoFocus} />;
}

//* 한글은 1글자도 의미가 있으므로 1글자부터 자동완성
const SUGGEST_MIN_LENGTH = 1;
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

//* 제목에서 검색어와 일치하는 부분을 <mark>로 감싼다 (대소문자 무시, 첫 일치만)
function highlight(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}

//* 드롭다운 항목: 최근 검색어 또는 자동완성 결과
type DropdownItem =
  | { type: "recent"; key: string; query: string }
  | { type: "suggestion"; key: string; suggestion: SearchSuggestion };

function SearchInput({ initialSearch, autoFocus }: { initialSearch: string; autoFocus: boolean }) {
  const { ott } = useParams<{ ott?: string }>();
  const providerId = ottSlugToProviderId(ott);
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState(initialSearch);
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = search.trim();
  const debouncedSearch = useDebouncedValue(trimmed, SUGGEST_DEBOUNCE_MS);
  const canSuggest = debouncedSearch.length >= SUGGEST_MIN_LENGTH;

  const { data: suggestions = [], isError } = useQuery({
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

  const close = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const submit = (value: string) => {
    const query = value.trim();
    if (!query) return;
    setRecent(addRecentSearch(query));
    close();
    const searchPath = ott
      ? `/${ott}/search?q=${encodeURIComponent(query)}`
      : `/search?q=${encodeURIComponent(query)}`;
    router.push(searchPath);
  };

  const openSuggestion = (suggestion: SearchSuggestion) => {
    setRecent(addRecentSearch(suggestion.title));
    close();
    router.push(programHref(suggestion.id, suggestion.mediaType));
  };

  // 입력 중에는 검색어로 시작하는 최근 검색어만, 비어 있으면 전부
  const visibleRecent = trimmed
    ? recent.filter((item) => item !== trimmed && item.toLowerCase().startsWith(trimmed.toLowerCase()))
    : recent;
  const visibleSuggestions = canSuggest && trimmed.length >= SUGGEST_MIN_LENGTH ? suggestions : [];

  const items: DropdownItem[] = [
    ...visibleRecent.map((query) => ({ type: "recent" as const, key: `recent-${query}`, query })),
    ...visibleSuggestions.map((suggestion) => ({
      type: "suggestion" as const,
      key: `suggest-${suggestion.mediaType}-${suggestion.id}`,
      suggestion,
    })),
  ];
  const showError = isOpen && canSuggest && isError;
  const showDropdown = isOpen && (items.length > 0 || showError);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length > 0) {
      e.preventDefault();
      if (!isOpen) openDropdown();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      const active = activeIndex >= 0 ? items[activeIndex] : undefined;
      if (active?.type === "suggestion") openSuggestion(active.suggestion);
      else if (active?.type === "recent") submit(active.query);
      else submit(search);
    } else if (e.key === "Escape") {
      close();
    }
  };

  let optionIndex = -1;

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="search"
          placeholder="영화, TV 프로그램 검색..."
          value={search}
          autoFocus={autoFocus}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(-1);
            if (!isOpen) openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
        />
        <button className={styles.button} type="button" onClick={() => submit(search)}>
          Search
        </button>
      </div>

      {showDropdown && (
        <div className={styles.dropdown}>
          <div id={listId} role="listbox" aria-label="검색 제안">
            {visibleRecent.length > 0 && (
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
                  {visibleRecent.map((item) => {
                    const index = ++optionIndex;
                    return (
                      <li
                        key={item}
                        className={`${styles.recentItem} ${activeIndex === index ? styles.optionActive : ""}`}
                      >
                        <button
                          id={optionId(index)}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          tabIndex={-1}
                          className={styles.recentQuery}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => submit(item)}
                        >
                          {highlight(item, trimmed)}
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
                    );
                  })}
                </ul>
              </div>
            )}

            {visibleSuggestions.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span>추천 결과</span>
                </div>
                <ul className={styles.list}>
                  {visibleSuggestions.map((item) => {
                    const index = ++optionIndex;
                    const poster = posterUrl(item.posterPath, "w342");
                    const year = releaseYear(item.releaseDate);
                    return (
                      <li key={`${item.mediaType}-${item.id}`}>
                        <button
                          id={optionId(index)}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          tabIndex={-1}
                          className={`${styles.suggestion} ${activeIndex === index ? styles.optionActive : ""}`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => openSuggestion(item)}
                        >
                          {poster ? (
                            <Image src={poster} alt="" width={32} height={48} className={styles.suggestionPoster} />
                          ) : (
                            <span className={styles.suggestionPoster} />
                          )}
                          <span className={styles.suggestionBody}>
                            <span className={styles.suggestionTitle}>{highlight(item.title, trimmed)}</span>
                            <span className={styles.suggestionMeta}>
                              {item.mediaType === "movie" ? "영화" : "TV"}
                              {year && ` · ${year}`}
                            </span>
                          </span>
                          <span className={styles.suggestionBadges}>
                            <ProviderBadges providers={item.providers ?? []} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className={`${styles.textButton} ${styles.seeAll}`}
                  onClick={() => submit(search)}
                >
                  &ldquo;{trimmed}&rdquo; 전체 결과 보기 <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
            )}
          </div>

          {showError && (
            <p className={styles.errorNote} role="status">
              자동완성을 불러오지 못했습니다. Enter를 누르면 검색 페이지로 이동합니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
