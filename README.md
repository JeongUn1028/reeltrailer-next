# ReelTrailer

TMDB 데이터를 바탕으로 영화와 TV 프로그램을 탐색하고, 국내 구독형 OTT에서 제공되는 콘텐츠를 확인하는 서비스입니다. 인기 예고편, OTT별 추천, 장르별 목록, 통합 검색과 상세 정보를 한 흐름으로 제공합니다.

## 주요 기능

- 인기 영화 예고편 캐러셀과 YouTube 임베드 재생
- Netflix, Disney+, Tving, Watcha, Wavve별 콘텐츠 필터링
- 영화, TV 프로그램, 장르별 추천 목록
- 제목 기반 영화·TV 통합 검색
- 포스터, 원제, 줄거리, 평점, 공개 연도, 장르, 제공 OTT를 포함한 상세 화면
- 일반 상세 페이지와 인터셉팅 라우트 모달의 동일한 상세 UI 재사용
- Suspense 기반 검색창·캐러셀·추천 목록 스켈레톤과 캐러셀 오류 상태
- 유효하지 않은 OTT 경로와 존재하지 않거나 잘못된 상세 요청의 404 처리
- Vercel Cron을 통한 TMDB 콘텐츠, 예고편, 국내 OTT 제공 정보 동기화
- Open Graph 메타데이터, `robots.txt`, `sitemap.xml`, Vercel Speed Insights 적용

## 화면과 라우팅

| 경로                               | 설명                                     |
| ---------------------------------- | ---------------------------------------- |
| `/`                                | 전체 콘텐츠 홈, 예고편 캐러셀, 추천 목록 |
| `/netflix`                         | Netflix 필터 페이지                      |
| `/disney-plus`                     | Disney+ 필터 페이지                      |
| `/tving`                           | Tving 필터 페이지                        |
| `/watcha`                          | Watcha 필터 페이지                       |
| `/wavve`                           | Wavve 필터 페이지                        |
| `/search?q={query}`                | 제목 통합 검색 결과                      |
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
| Quality           | ESLint 9                    |

## 아키텍처

### 데이터 흐름

- 추천 목록과 상세 화면은 서버 컴포넌트에서 `src/server/contents.ts`의 Prisma 조회 함수를 사용합니다.
- 예고편 캐러셀은 클라이언트 컴포넌트이며 `/api/getMovies`를 TanStack Query로 요청합니다.
- 캐러셀은 OTT slug를 쿼리 키에 포함하고, 기본적으로 5분 동안 데이터를 fresh 상태로 유지하며 10분 뒤 가비지 컬렉션합니다.
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
```

| 변수                   | 용도                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | 애플리케이션에서 사용하는 PostgreSQL 연결 문자열                  |
| `DIRECT_URL`           | Prisma migration에 사용하는 직접 PostgreSQL 연결 문자열           |
| `TMDB_API_KEY`         | TMDB 콘텐츠, 예고편, 제공자 정보 동기화                           |
| `CRON_SECRET_KEY`      | 동기화 endpoint의 Bearer 인증 토큰                                |
| `NEXT_PUBLIC_API_URL`  | 브라우저에서 캐러셀 API를 요청할 기준 URL. `/api`를 포함해야 함   |
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

### 실행과 검사

```bash
# 개발 서버: http://localhost:3000
npm run dev

# ESLint 검사
npm run lint

# Prisma Client 생성 후 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## API

| Method | Endpoint                  | Query parameter                          | 설명                               |
| ------ | ------------------------- | ---------------------------------------- | ---------------------------------- |
| `GET`  | `/api/getMovies`          | `page`, `limit` 필수; `providerId` 선택  | 인기순 영화 목록 반환              |
| `GET`  | `/api/getTvShows`         | `page`, `limit`, `providerId` 선택       | 인기순 TV 프로그램 목록 반환       |
| `GET`  | `/api/getProgramsByGenre` | `genre` 필수; `limit`, `providerId` 선택 | 장르별 영화와 TV 목록 반환         |
| `GET`  | `/api/search`             | `q` 선택                                 | 제목을 대소문자 구분 없이 검색     |
| `GET`  | `/api/getProgramById`     | `id`, `kind` 필수                        | 영화 또는 TV 프로그램 상세 반환    |
| `GET`  | `/api/cron/sync-tmdb`     | 없음                                     | TMDB 동기화 실행, Bearer 인증 필요 |

`kind`는 `movie` 또는 `tvshow`만 허용합니다. 검색은 유형별 최대 20개를 인기순으로 조회하며, 빈 검색어는 빈 배열을 반환합니다. 장르 API는 아래처럼 콘텐츠 유형별 배열을 반환합니다.

```json
{
  "movies": [{ "id": 1, "mediaType": "movie" }],
  "tvShows": [{ "id": 2, "mediaType": "tvshow" }]
}
```

## TMDB 동기화

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

동기화는 TMDB의 인기 영화와 TV 프로그램을 조회하고, 한국(`KR`)의 `flatrate` 제공자 정보와 예고편 키를 저장합니다. Cron 요청은 다음과 같이 `CRON_SECRET_KEY`와 일치하는 Authorization 헤더가 있어야 합니다.

```http
Authorization: Bearer <CRON_SECRET_KEY>
```

Vercel 배포 시 `DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `CRON_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`을 프로젝트 환경 변수에 설정해야 합니다.

## 프로젝트 구조

```text
src/
├── app/
│   ├── (with-searchBar)/       # 홈, OTT 필터, 검색 페이지
│   ├── @modal/                 # 인터셉팅 라우트 상세 모달
│   ├── api/                    # Route Handlers
│   ├── components/             # 헤더, 캐러셀, 검색, 콘텐츠 UI
│   ├── program/[programId]/    # 직접 접근하는 상세 페이지
│   ├── provider.tsx            # TanStack Query provider
│   ├── robots.ts, sitemap.ts   # SEO metadata routes
│   └── types/                  # 화면용 타입
├── config/                     # 장르와 OTT provider ID 매핑
└── server/                     # Prisma singleton과 콘텐츠 조회 로직

prisma/
├── schema.prisma               # PostgreSQL 데이터 모델
├── migrations/                 # migration 이력
└── seed.ts                     # 장르 초기 데이터
```

## 제약 사항

- OTT 제공 정보는 TMDB가 한국 지역에서 구독형(`flatrate`)으로 제공하는 항목만 대상으로 합니다. 대여·구매 제공자는 포함하지 않습니다.
- 콘텐츠와 예고편의 제공 여부는 TMDB와 YouTube의 지역·메타데이터 상태에 영향을 받습니다.
- 검색 결과는 현재 페이지네이션을 제공하지 않으며, 각 유형별 최대 20개를 반환합니다.
- 지원 OTT는 Netflix, Disney+, Tving, Watcha, Wavve입니다.

## 데이터 출처

콘텐츠 메타데이터와 이미지는 TMDB API를 통해 제공됩니다. 배포 전 TMDB 이용 약관과 이미지 사용 정책을 확인하세요.
