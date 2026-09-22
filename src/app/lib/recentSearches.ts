//* 최근 검색어 (로그인 없이 localStorage에만 저장)
const STORAGE_KEY = "reeltrailer:recent-searches";
const MAX_ITEMS = 8;

const safeRead = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
};

const safeWrite = (items: string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 사생활 보호 모드 등에서 저장 실패 시 무시
  }
};

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  return safeRead();
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();
  const next = [trimmed, ...safeRead().filter((q) => q !== trimmed)].slice(0, MAX_ITEMS);
  safeWrite(next);
  return next;
}

export function removeRecentSearch(query: string): string[] {
  const next = safeRead().filter((q) => q !== query);
  safeWrite(next);
  return next;
}

export function clearRecentSearches(): string[] {
  safeWrite([]);
  return [];
}
