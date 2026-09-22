# ReelTrailer

TMDB 데이터를 바탕으로 영화와 TV 프로그램을 탐색하고, 국내 구독형 OTT에서 제공되는 콘텐츠를 확인하는 서비스입니다. 인기 예고편, OTT별 추천, 장르별 목록, 통합 검색과 상세 정보를 한 흐름으로 제공합니다.

## 주요 기능

- 예고편 쇼케이스: 홈 필터(OTT/유형/정렬)를 반영한 영화·TV 예고편 목록, 클릭 시에만 YouTube 로드, 목록 전환·연속 재생, 키보드 탐색, 재생 중 작품 캡션
- Netflix, Disney+, Tving, Watcha, Wavve별 콘텐츠 필터링
- 최근 공개 신작(최근 45일 인기순), 영화, TV 프로그램, 장르별 추천 행 (전체/영화/TV 토글, 인기순/최신순/평점순 정렬). 장르 행은 앞 행에 나온 작품을 제외해 중복을 줄이고, 행마다 좌/우 화살표·scroll-snap, 카드에 OTT 배지 표시. 화면 아래 행은 스크롤에 따라 등장(CSS 스크롤 기반 애니메이션 + `content-visibility`)
- 조건별 전체 목록 페이지(`/browse`)와 무한 스크롤 (JS 없는 환경은 페이지 링크)
- 제목·원제 기반 영화·TV 통합 검색, 자동완성, 최근 검색어(브라우저 로컬 저장), 결과 유형 탭, 무한 스크롤
- backdrop 히어로, 예고편 재생, OTT 바로가기 링크, 비슷한 콘텐츠를 포함한 상세 화면
- 일반 상세 페이지와 인터셉팅 라우트 모달의 동일한 상세 UI 재사용
- Suspense 기반 검색창·예고편 쇼케이스·추천 목록 스켈레톤과 오류 폴백
- 유효하지 않은 OTT 경로와 존재하지 않거나 잘못된 상세 요청의 404 처리, 데이터 오류 시 에러 폴백 화면
- 전체 기간의 국내 OTT 구독형 콘텐츠를 1회 백필(로컬 스크립트)하고, Vercel Cron이 매일 인기·신작 갱신과 순환 재검증(제공 종료 콘텐츠 정리)을 수행. 캐시 무효화, 웹훅 알림
- Open Graph 메타데이터, `robots.txt`, `sitemap.xml`, Vercel Speed Insights 적용

## 화면과 라우팅

| 경로                               | 설명                                     |
| ---------------------------------- | ---------------------------------------- |
| `/`                                | 전체 콘텐츠 홈, 예고편 쇼케이스, 추천 목록 |
| `/netflix`                         | Netflix 필터 페이지                      |
| `/disney-plus`                     | Disney+ 필터 페이지                      |
| `/tving`                           | Tving 필터 페이지                        |
| `/watcha`                          | Watcha 필터 페이지                       |
| `/wavve`                           | Wavve 필터 페이지                        |
| `/browse?ott=&kind=&genre=&sort=&page=` | 조건별 전체 목록 (더 보기)          |
| `/search?q={query}&type=`          | 제목 통합 검색 결과 (`type`: movie/tvshow) |
| `/program/{programId}?kind=movie`  | 영화 상세 페이지                         |
| `/program/{programId}?kind=tvshow` | TV 프로그램 상세 페이지                  |

콘텐츠 카드를 통해 상세 화면으로 이동할 때는 Next.js 인터셉팅 라우트가 상세 UI를 모달로 표시합니다. URL에 직접 접근하거나 새로고침하면 동일한 UI가 독립 페이지로 표시됩니다.

```mermaid
flowchart TD
	A[홈] --> B[OTT 필터]
	A --> C[장르 추천]
	A --> D[통합 검색]
	B --> E[콘텐츠 카드]
	C --> E
	D --> E
	E --> F[상세 모달 또는 상세 페이지]
```

## 기술 스택

| 영역              | 사용 기술                   |
| ----------------- | --------------------------- |
| Framework         | Next.js 16 App Router       |
| Language          | TypeScript, React 19        |
| UI                | CSS Modules, Tailwind CSS 4 |
| Client data       | TanStack Query 5            |
| Database          | PostgreSQL, Prisma 6        |
| External services | TMDB API, YouTube Embed     |
| Observability     | Vercel Speed Insights       |
| Deployment        | Vercel, Vercel Cron         |
| Quality           | ESLint 9, Vitest            |

## 아키텍처

### 데이터 흐름

- 홈 추천 행은 `src/server/contents.ts`의 `getCatalog()`가 영화/TV **인기 상위 1,000건씩**을 쿼리 2개로 조회해 Next Data Cache(`unstable_cache`, 태그 `contents`)에 저장하고, `src/server/catalog.ts`의 순수 함수가 메모리에서 행을 구성합니다. 전체 콘텐츠(수만 건)를 캐시에 넣으면 항목당 2MB 제한을 넘기 때문에 상위만 담습니다.
- `/browse`, 검색, 사이트맵 등 전체 목록은 `src/server/program-query.ts`의 where/orderBy 빌더로 DB에서 페이지 단위로 직접 조회합니다(pg_trgm·popularity·날짜 인덱스). `kind=all`은 영화/TV를 유형별 페이지로 가져와 합칩니다.
- Cron 동기화가 끝나면 `revalidateTag("contents")`로 캐시를 무효화하고, 그 사이에는 1시간마다 재검증합니다.
- 예고편 쇼케이스는 서버 컴포넌트가 카탈로그에서 예고편 목록을 골라 props로 넘기고, 클라이언트는 사용자가 재생을 누를 때만 YouTube IFrame API를 불러옵니다(영상 종료 시 다음 예고편 자동 재생). 검색 자동완성은 `/api/search/suggest`를 TanStack Query로 요청합니다.
- `Movie`와 `TvShow`는 별도 모델이지만 화면에서는 `mediaType: "movie" | "tvshow"`으로 통합합니다. 같은 TMDB ID가 서로 다른 유형에 존재할 수 있으므로 상세 URL에는 `kind`가 필요합니다.

### 데이터 모델

`Movie`와 `TvShow`는 `Genre`, `WatchProvider`와 각각 다대다 관계입니다. 관계 테이블은 콘텐츠별 장르와 시청 제공자를 분리해 관리합니다.

```mermaid
erDiagram
		Movie ||--o{ MoviesOnGenres : has
		Genre ||--o{ MoviesOnGenres : contains
		TvShow ||--o{ TvShowsOnGenres : has
		Genre ||--o{ TvShowsOnGenres : contains
		Movie ||--o{ MoviesOnWatchProviders : available_on
		TvShow ||--o{ TvShowsOnWatchProviders : available_on
		WatchProvider ||--o{ MoviesOnWatchProviders : provides
		WatchProvider ||--o{ TvShowsOnWatchProviders : provides
```

## 시작하기

### 요구 사항

- Node.js 20 이상
- PostgreSQL 데이터베이스
- TMDB API 키

### 설치

```bash
git clone <repository-url>
cd reeltrailer-next
npm install
```

### 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다. `.env*` 파일은 Git에서 제외됩니다. 실제 키와 데이터베이스 연결 문자열은 커밋하지 마세요.

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"
TMDB_API_KEY="your-tmdb-api-key"
CRON_SECRET_KEY="your-cron-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
# 선택: 동기화 결과를 받을 Discord/Slack incoming webhook
SYNC_WEBHOOK_URL=""
```

| 변수                   | 용도                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | 애플리케이션에서 사용하는 PostgreSQL 연결 문자열                  |
| `DIRECT_URL`           | Prisma migration에 사용하는 직접 PostgreSQL 연결 문자열           |
| `TMDB_API_KEY`         | TMDB 콘텐츠, 예고편, 제공자 정보 동기화                           |
| `CRON_SECRET_KEY`      | 동기화 endpoint의 Bearer 인증 토큰                                |
| `NEXT_PUBLIC_API_URL`  | (선택) 외부에서 API를 호출할 때의 기준 URL. 앱 내부에서는 더 이상 사용하지 않음 |
| `SYNC_WEBHOOK_URL`     | (선택) Cron 동기화 결과 알림용 웹훅 URL                           |
| `NEXT_PUBLIC_SITE_URL` | metadata, canonical URL, sitemap, robots 생성에 사용할 서비스 URL |

### 데이터베이스 준비

로컬 개발에서는 migration을 생성·적용합니다.

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

배포 환경에서는 이미 생성된 migration만 적용합니다.

```bash
npx prisma migrate deploy
npx prisma db seed
```

시드는 영화와 TV 장르 기준 데이터를 등록합니다. 이후 Cron 동기화를 실행하거나 TMDB 데이터를 별도로 수집하면 탐색할 콘텐츠가 채워집니다.

TMDB 키 없이 화면만 확인하려면 로컬 DB에 가짜 콘텐츠를 넣을 수 있습니다 (운영 DB에는 실행하지 마세요).

```bash
# 예: Docker로 로컬 PostgreSQL 실행
docker run -d --name reeltrailer-pg -e POSTGRES_USER=reel -e POSTGRES_PASSWORD=reel -e POSTGRES_DB=reeltrailer -p 55432:5432 postgres:16-alpine
export DATABASE_URL="postgresql://reel:reel@localhost:55432/reeltrailer"
export DIRECT_URL="$DATABASE_URL"
npx prisma migrate deploy && npx prisma db seed && npm run db:seed:dev
```

### 실행과 검사

```bash
# 개발 서버: http://localhost:3000
npm run dev

# ESLint 검사
npm run lint

# 단위 테스트 (Vitest)
npm test

# Prisma Client 생성 후 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## API

| Method | Endpoint                  | Query parameter                          | 설명                               |
| ------ | ------------------------- | ---------------------------------------- | ---------------------------------- |
| `GET`  | `/api/getMoviesList`      | `page`, `limit`, `providerId`, `sort` 선택 | 영화 목록 반환 (`total` 포함)      |
| `GET`  | `/api/getTvShows`         | `page`, `limit`, `providerId`, `sort` 선택 | TV 프로그램 목록 반환              |
| `GET`  | `/api/getProgramsByGenre` | `genre`(이름 또는 ID) 필수; `limit`, `providerId`, `sort` 선택 | 장르별 영화와 TV 목록 반환 |
| `GET`  | `/api/browse`             | `ott`, `kind`, `genre`, `sort`, `page`, `limit` 선택 | 목록 페이지용 `{ items, total, page, limit, hasMore }` |
| `GET`  | `/api/search`             | `q`, `providerId`, `kind`, `page`, `limit` 선택 | 제목·원제 검색 `{ items, page, hasMore }` |
| `GET`  | `/api/search/suggest`     | `q`(2글자 이상), `providerId` 선택       | 자동완성용 경량 결과 (최대 8개)    |
| `GET`  | `/api/getProgramById`     | `id`, `kind` 필수                        | 영화 또는 TV 프로그램 상세 반환    |
| `GET`  | `/api/cron/sync-tmdb`     | 없음                                     | TMDB 동기화 실행, Bearer 인증 필요 |

`kind`는 `movie` 또는 `tvshow`만, `sort`는 `popular`(기본) · `latest` · `rating`만 허용합니다. 카탈로그 기반 API 응답에는 `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`이 붙습니다. 검색은 유형별로 `limit`개씩(기본 20) 페이지 단위로 조회해 인기순으로 합치므로 `kind=all`이면 한 페이지에 최대 `2×limit`개가 옵니다. 빈 검색어는 빈 목록을 반환합니다. 장르 API는 아래처럼 콘텐츠 유형별 배열을 반환합니다.

```json
{
  "movies": [{ "id": 1, "mediaType": "movie" }],
  "tvShows": [{ "id": 2, "mediaType": "tvshow" }]
}
```

## TMDB 동기화

### 최초 백필 (로컬 1회)

전체 기간의 국내 OTT 구독형 콘텐츠(약 33,000건, 2026년 기준)는 Vercel 함수 시간 제한 안에 넣을 수 없으므로 로컬에서 스크립트로 넣습니다. 연도 단위로 discover를 순회하고(쿼리당 500페이지 제한 회피), 진행 상태를 `.backfill-state.json`에 저장해 중단 후 이어서 실행할 수 있습니다.

```bash
# 운영 DB에 직접 연결해 실행 (약 40~60분, rps 25 기준)
DATABASE_URL="..." DIRECT_URL="..." TMDB_API_KEY="..." npm run backfill
# 일부 연도만 / 속도 조절 / 처음부터 다시
npm run backfill -- --from 2020 --to 2026 --rps 30 --reset
```

### 일일 증분 동기화 (Vercel Cron)

`vercel.json`은 `/api/cron/sync-tmdb`를 매일 `18:00 UTC`에 실행합니다.

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-tmdb",
      "schedule": "0 18 * * *"
    }
  ]
}
```

Cron은 실행 시간 예산(300초) 안에서 세 단계를 수행합니다.

1. 현재 인기 상위 영화/TV 각 300건 갱신
2. 최근 30일 신작 영화/TV 각 최대 300건 추가
3. `updatedAt`이 가장 오래된 콘텐츠부터 최대 800건의 국내 제공자를 재조회해, 제공이 끝난 콘텐츠는 삭제하고 나머지는 관계를 갱신합니다 (남은 시간에 맞춰 개수가 줄어듭니다). 33,000건 기준 약 40일에 한 바퀴 돕니다.

Netflix Standard with Ads(1796)는 Netflix(8)로 병합됩니다. 완료 후 `contents` 캐시 태그를 무효화하고, `SYNC_WEBHOOK_URL`이 설정되어 있으면 결과 요약을 Discord/Slack 웹훅으로 전송합니다.

라우트의 `maxDuration`은 300초입니다. Vercel Hobby 플랜은 기본 60초가 상한이므로 프로젝트 설정에서 **Fluid compute를 활성화**해야 합니다(무료). Cron 요청은 다음과 같이 `CRON_SECRET_KEY`와 일치하는 Authorization 헤더가 있어야 합니다.

```http
Authorization: Bearer <CRON_SECRET_KEY>
```

Vercel 배포 시 `DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `CRON_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`을 프로젝트 환경 변수에 설정해야 합니다.

## 프로젝트 구조

```text
src/
├── app/
│   ├── (with-searchBar)/       # 홈, OTT 필터, 목록(browse), 검색 페이지
│   ├── @modal/                 # 인터셉팅 라우트 상세 모달
│   ├── api/                    # Route Handlers
│   ├── components/             # 헤더, 예고편 쇼케이스, 검색, 콘텐츠, 에러 UI
│   ├── lib/                    # URL/이미지 헬퍼, 파라미터 파싱, 최근 검색어
│   ├── program/[programId]/    # 직접 접근하는 상세 페이지
│   ├── error.tsx, global-error.tsx  # 에러 바운더리
│   ├── provider.tsx            # TanStack Query provider
│   ├── robots.ts, sitemap.ts   # SEO metadata routes
│   └── types/                  # 화면용 타입
├── config/                     # 장르와 OTT provider ID 매핑
└── server/
    ├── prisma.ts               # Prisma singleton
    ├── contents.ts             # 캐시된 카탈로그, 상세, 검색 조회
    ├── catalog.ts              # 필터/정렬/페이지네이션 순수 함수
    ├── program-query.ts        # 전체 목록 DB 조회용 where/orderBy 빌더
    └── sync/                   # TMDB 클라이언트, 저장 로직, 백필 계획, 재검증, 웹훅 알림

scripts/
└── backfill-tmdb.ts            # 전체 기간 1회 백필 스크립트

prisma/
├── schema.prisma               # PostgreSQL 데이터 모델
├── migrations/                 # migration 이력
└── seed.ts                     # 장르 초기 데이터
```

## 제약 사항

- OTT 제공 정보는 TMDB가 한국 지역에서 구독형(`flatrate`)으로 제공하는 항목만 대상으로 합니다. 대여·구매 제공자는 포함하지 않습니다.
- 콘텐츠와 예고편의 제공 여부는 TMDB와 YouTube의 지역·메타데이터 상태에 영향을 받습니다.
- 검색 결과는 유형별 20개 단위로 무한 스크롤됩니다. `전체` 탭은 영화·TV를 각각 페이지 단위로 가져와 합치므로 두 유형이 완전히 인기순으로 섞이지는 않습니다.
- 지원 OTT는 Netflix, Disney+, Tving, Watcha, Wavve입니다.

## 데이터 출처

콘텐츠 메타데이터와 이미지는 TMDB API를 통해 제공됩니다. 배포 전 TMDB 이용 약관과 이미지 사용 정책을 확인하세요.
