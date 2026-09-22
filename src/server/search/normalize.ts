//* 검색어/제목 정규화. DB의 searchText 컬럼과 검색어에 같은 규칙을 적용해
//* 띄어쓰기·대소문자·구두점 차이에 무관하게 매칭한다.
//* migration SQL의 regexp_replace(lower(x), '[\s[:punct:]]', '', 'g')와 같은 결과여야 한다.

export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

//* 제목·원제·영문 제목을 정규화해 "|"로 이은 검색용 문자열 (중복/빈 값 제외)
export function buildSearchText({
  title,
  originalTitle,
  englishTitle,
}: {
  title: string;
  originalTitle?: string | null;
  englishTitle?: string | null;
}): string {
  const parts: string[] = [];
  for (const raw of [title, originalTitle, englishTitle]) {
    const normalized = normalizeSearchText(raw);
    if (normalized && !parts.includes(normalized)) parts.push(normalized);
  }
  return parts.join("|");
}

//* 관련도 등급: 정확 일치 4 > 접두 일치 3 > 부분 일치 2 > 유사(trigram) 1
//* SQL의 CASE 식과 같은 규칙이며, 정렬 검증과 클라이언트 표시에 사용한다.
export function rankMatch(
  hit: { titleNormalized: string; searchText: string },
  normalizedQuery: string,
): 1 | 2 | 3 | 4 {
  if (!normalizedQuery) return 1;
  if (hit.titleNormalized === normalizedQuery) return 4;
  if (hit.titleNormalized.startsWith(normalizedQuery)) return 3;
  if (hit.searchText.includes(normalizedQuery)) return 2;
  return 1;
}
