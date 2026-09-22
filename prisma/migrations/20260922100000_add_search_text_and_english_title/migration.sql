-- 검색 품질 개선: 영문 제목 컬럼과 정규화된 검색 문자열(searchText) 추가
ALTER TABLE "Movie"  ADD COLUMN IF NOT EXISTS "englishTitle" TEXT;
ALTER TABLE "Movie"  ADD COLUMN IF NOT EXISTS "searchText"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "TvShow" ADD COLUMN IF NOT EXISTS "englishTitle" TEXT;
ALTER TABLE "TvShow" ADD COLUMN IF NOT EXISTS "searchText"   TEXT NOT NULL DEFAULT '';

-- 기존 행의 searchText를 제목/원제로 즉시 채운다 (src/server/search/normalize.ts와 같은 규칙:
-- NFKC 정규화는 SQL에서 생략, 소문자화 + 공백/구두점 제거, 중복 제거 후 "|"로 연결)
CREATE OR REPLACE FUNCTION reeltrailer_normalize(text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$
    SELECT regexp_replace(lower(coalesce($1, '')), '[[:space:][:punct:]]', '', 'g')
  $$;

UPDATE "Movie" SET "searchText" = (
  SELECT string_agg(DISTINCT v, '|') FROM unnest(ARRAY[
    reeltrailer_normalize("title"), reeltrailer_normalize("originalTitle"), reeltrailer_normalize("englishTitle")
  ]) AS v WHERE v <> ''
) WHERE "searchText" = '';

UPDATE "TvShow" SET "searchText" = (
  SELECT string_agg(DISTINCT v, '|') FROM unnest(ARRAY[
    reeltrailer_normalize("title"), reeltrailer_normalize("originalTitle"), reeltrailer_normalize("englishTitle")
  ]) AS v WHERE v <> ''
) WHERE "searchText" = '';

CREATE INDEX IF NOT EXISTS "Movie_searchText_trgm_idx"  ON "Movie"  USING GIN ("searchText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TvShow_searchText_trgm_idx" ON "TvShow" USING GIN ("searchText" gin_trgm_ops);
