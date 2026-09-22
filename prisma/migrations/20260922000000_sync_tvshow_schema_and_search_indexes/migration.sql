-- 1) 기존 migration 이력과 schema.prisma의 불일치 해소
--    이력에는 TvShow.name / originalName 과 TvShowsOnGenres 누락 상태였으나,
--    schema.prisma(및 운영 DB)는 title / originalTitle + TvShowsOnGenres 를 사용한다.
--    운영 DB처럼 이미 반영된 환경에서도 실패하지 않도록 모두 조건부로 작성한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'TvShow' AND column_name = 'name'
  ) THEN
    ALTER TABLE "TvShow" RENAME COLUMN "name" TO "title";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'TvShow' AND column_name = 'originalName'
  ) THEN
    ALTER TABLE "TvShow" RENAME COLUMN "originalName" TO "originalTitle";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TvShowsOnGenres" (
    "tvShowId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,
    CONSTRAINT "TvShowsOnGenres_pkey" PRIMARY KEY ("tvShowId","genreId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TvShowsOnGenres_tvShowId_fkey') THEN
    ALTER TABLE "TvShowsOnGenres"
      ADD CONSTRAINT "TvShowsOnGenres_tvShowId_fkey"
      FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TvShowsOnGenres_genreId_fkey') THEN
    ALTER TABLE "TvShowsOnGenres"
      ADD CONSTRAINT "TvShowsOnGenres_genreId_fkey"
      FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2) 제목/원제 부분 일치 검색(ILIKE '%q%')이 인덱스를 타도록 pg_trgm GIN 인덱스 추가
--    Supabase / Neon / RDS 등 대부분의 관리형 PostgreSQL에서 pg_trgm 확장을 지원한다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Movie_title_trgm_idx"
  ON "Movie" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Movie_originalTitle_trgm_idx"
  ON "Movie" USING GIN ("originalTitle" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TvShow_title_trgm_idx"
  ON "TvShow" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TvShow_originalTitle_trgm_idx"
  ON "TvShow" USING GIN ("originalTitle" gin_trgm_ops);

-- 3) stale 콘텐츠 정리(updatedAt < 동기화 시작 시각)용 인덱스
CREATE INDEX IF NOT EXISTS "Movie_updatedAt_idx" ON "Movie" ("updatedAt");
CREATE INDEX IF NOT EXISTS "TvShow_updatedAt_idx" ON "TvShow" ("updatedAt");
