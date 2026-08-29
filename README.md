# ReelTrailer

영화와 TV 프로그램을 탐색하고, 어떤 OTT 서비스에서 시청할 수 있는지 확인할 수 있는 콘텐츠 큐레이션 서비스입니다. TMDB에서 수집한 콘텐츠를 PostgreSQL에 저장하고, 인기도·장르·OTT 서비스·검색어를 기준으로 빠르게 탐색할 수 있도록 구성했습니다.

> 콘텐츠 수집부터 데이터 모델링, 서버 렌더링, 인터셉팅 라우트 기반 상세 모달까지 하나의 서비스 흐름으로 구현한 프로젝트입니다.

## 프로젝트 소개

### 해결하려는 문제

여러 OTT 서비스에 흩어진 영화와 TV 프로그램 정보를 한 곳에서 찾고, 제목이나 장르를 기준으로 원하는 콘텐츠를 빠르게 찾을 수 있도록 했습니다.

### 주요 기능

- 영화와 TV 프로그램 인기 콘텐츠 탐색
- Netflix, Disney+, Tving, Watcha, Wavve별 콘텐츠 필터링
- 장르별 추천 섹션 제공
- 제목 기반 영화·TV 통합 검색
- 포스터, 원제, 줄거리, 평점, 공개 연도, 장르, 시청 가능 OTT 표시
- 동일한 상세 컴포넌트를 일반 페이지와 인터셉팅 라우트 모달에서 재사용
- 캐러셀과 추천 목록의 Suspense 기반 로딩 스켈레톤 UI
- 존재하지 않는 프로그램, 잘못된 프로그램 타입, 유효하지 않은 OTT 경로의 404 처리
- Vercel Cron을 통한 TMDB 콘텐츠 및 예고편 정보 동기화

## 사용자 흐름

```mermaid
flowchart TD
		A[홈] --> B[OTT 탭 선택]
		A --> C[장르별 추천]
		A --> D[검색어 입력]
		B --> E[OTT별 콘텐츠 목록]
		C --> F[영화 및 TV 카드]
		D --> G[통합 검색 결과]
		E --> H[프로그램 상세]
		F --> H
		G --> H
		H --> I{인터셉팅 라우트}
		I -->|지원| J[상세 모달]
		I -->|직접 접근| K[상세 페이지]
```

## 기술 스택

| 영역         | 기술                        |
| ------------ | --------------------------- |
| Framework    | Next.js App Router 16       |
| Language     | TypeScript                  |
| UI           | React 19                    |
| Styling      | CSS Modules, Tailwind CSS 4 |
| ORM          | Prisma 6                    |
| Database     | PostgreSQL                  |
| External API | TMDB API, YouTube Embed     |
| Deployment   | Vercel                      |
| Code quality | ESLint 9                    |

## 설계 포인트

### 서버 컴포넌트와 클라이언트 쿼리 분리

추천 섹션과 상세 정보는 서버 컴포넌트에서 Prisma를 통해 조회합니다. 예고편 캐러셀은 React Query로 `/api/getMovies`를 조회하며, OTT 변경 시 provider ID를 쿼리 키에 포함해 캐시를 분리합니다. 브라우저 상호작용은 검색 입력, OTT 탭, 캐러셀 선택, 모달 닫기처럼 필요한 범위만 클라이언트 컴포넌트로 분리했습니다.

캐러셀과 추천 섹션은 각각 Suspense fallback을 제공하므로, 데이터를 기다리는 동안 실제 카드와 같은 크기의 스켈레톤 UI를 표시합니다.

### 영화와 TV의 공통 화면 모델

영화와 TV는 데이터베이스에서 별도 모델로 관리하지만 카드와 상세 화면에서는 `mediaType`으로 구분하는 공통 흐름을 사용합니다.

```ts
type ProgramMediaType = "movie" | "tvshow";
```

동일한 숫자 ID가 영화와 TV에 각각 존재할 수 있기 때문에 상세 링크는 ID만 사용하지 않고 다음과 같이 타입을 함께 전달합니다.

```text
/program/550?kind=movie
/program/550?kind=tvshow
```

### 모달과 일반 페이지의 재사용

`/program/[programId]`는 직접 접근할 수 있는 상세 페이지이고, 인터셉팅 라우트는 같은 `ProgramDetail`을 `<dialog>` 안에서 렌더링합니다. 따라서 새로고침이나 직접 URL 접근에서도 동일한 상세 콘텐츠를 유지합니다.

### 404 처리

다음 요청은 Next.js의 `notFound()`를 통해 공통 404 화면으로 연결됩니다.

- 숫자가 아닌 프로그램 ID 또는 양수가 아닌 ID
- `movie`, `tvshow`가 아닌 상세 타입
- 데이터베이스에 존재하지 않는 프로그램
- `ott-provider-ids.json`에 등록되지 않은 OTT slug

검색 결과가 없는 경우에는 유효한 검색 요청으로 보고 별도의 빈 상태 메시지를 표시합니다.

## 데이터 모델

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

주요 모델은 다음과 같습니다.

- `Movie`: 영화 제목, 포스터, 예고편, 개봉일, 평점, 인기도
- `TvShow`: TV 프로그램 제목, 포스터, 예고편, 첫 방영일, 평점, 인기도
- `WatchProvider`: OTT 서비스 이름, 로고, 표시 우선순위
- `Genre`: 영화 및 TV 프로그램 장르
- `MoviesOnGenres`, `TvShowsOnGenres`: 콘텐츠와 장르의 다대다 관계
- `MoviesOnWatchProviders`, `TvShowsOnWatchProviders`: 콘텐츠와 OTT의 다대다 관계

## 라우팅

| 경로                               | 설명                        |
| ---------------------------------- | --------------------------- |
| `/`                                | 전체 콘텐츠 홈 및 추천 섹션 |
| `/netflix`                         | Netflix 콘텐츠 필터 페이지  |
| `/disney-plus`                     | Disney+ 콘텐츠 필터 페이지  |
| `/tving`                           | Tving 콘텐츠 필터 페이지    |
| `/watcha`                          | Watcha 콘텐츠 필터 페이지   |
| `/wavve`                           | Wavve 콘텐츠 필터 페이지    |
| `/search?q=검색어`                 | 영화·TV 통합 검색 결과      |
| `/program/[programId]?kind=movie`  | 영화 상세 페이지            |
| `/program/[programId]?kind=tvshow` | TV 프로그램 상세 페이지     |

## API

| Method | Endpoint                  | 설명                                                           |
| ------ | ------------------------- | -------------------------------------------------------------- |
| GET    | `/api/getMovies`          | 인기순 영화 조회. `page`, `limit` 필수, `providerId` 필터 지원 |
| GET    | `/api/getTvShows`         | 인기순 TV 프로그램 조회. `page`, `limit` 필수, 필터 지원       |
| GET    | `/api/getProgramsByGenre` | 장르별 영화·TV 프로그램 조회. `genre` 필수                     |
| GET    | `/api/getProgramById`     | `id`와 `kind` 기준 상세 조회                                   |
| GET    | `/api/search`             | 제목 기준 영화·TV 통합 검색                                    |
| GET    | `/api/cron/sync-tmdb`     | Bearer 인증으로 보호된 TMDB 콘텐츠 및 제공자 동기화            |

장르 API는 영화와 TV를 구분할 수 있도록 다음 형태로 반환합니다.

```json
{
  "movies": [{ "id": 1, "mediaType": "movie" }],
  "tvShows": [{ "id": 2, "mediaType": "tvshow" }]
}
```

## 프로젝트 구조

```text
src/
├── app/
│   ├── (with-searchBar)/       # 홈, OTT 필터, 검색 페이지
│   ├── @modal/                 # 인터셉팅 라우트 기반 상세 모달
│   ├── api/                    # Next.js Route Handler
│   ├── components/             # 헤더, 캐러셀, 프로그램, 검색 UI
│   ├── program/[programId]/    # 직접 접근 가능한 상세 페이지
│   ├── not-found.tsx           # 공통 404 페이지
│   └── types/                 # 화면 데이터 타입
├── config/
│   ├── genre.json              # 장르 목록
│   └── ott-provider-ids.json   # OTT slug와 TMDB provider ID 매핑
├── server/
│   ├── contents.ts             # Prisma 기반 콘텐츠 조회 로직
│   └── prisma.ts               # Prisma client singleton
└── app/globals.css             # 전역 테마 및 dialog 스타일

prisma/
├── schema.prisma               # PostgreSQL 데이터 모델
├── seed.ts                     # 초기 데이터 시드
└── migrations/                 # 스키마 변경 이력
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

### 환경변수

프로젝트 루트에 `.env.local`을 생성합니다. 실제 키와 연결 문자열은 저장소에 커밋하지 않습니다.

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"
TMDB_API_KEY="your-tmdb-api-key"
CRON_SECRET_KEY="your-cron-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_SITE_URL="https://your-domain.example"
```

`NEXT_PUBLIC_API_URL`은 캐러셀에서 사용하는 브라우저용 API 기준 주소입니다. 로컬 개발 환경에서는 위 값처럼 `/api`까지 포함해야 합니다.

`NEXT_PUBLIC_SITE_URL`은 canonical URL, Open Graph, `robots.txt`, `sitemap.xml` 생성에 사용합니다. 배포 환경에서는 실제 서비스 도메인으로 설정합니다.

### 데이터베이스 준비

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 실행

```bash
# 개발 서버
npm run dev

# 코드 검사
npm run lint

# 프로덕션 빌드 및 실행
npm run build
npm start
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 데이터 동기화

`/api/cron/sync-tmdb`는 Vercel Cron으로 호출되며, `vercel.json`에 다음 스케줄이 정의되어 있습니다.

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

동기화 작업은 TMDB에서 인기 영화·TV 프로그램을 조회하고, 한국 지역에서 제공되는 OTT 정보와 예고편 키를 저장합니다. Cron 요청은 `CRON_SECRET_KEY`를 이용한 Bearer 인증이 필요합니다.

## 개선 예정

- 콘텐츠 조회 로직과 UI 컴포넌트의 책임을 더 세분화
- Prisma 결과를 화면 타입으로 변환하는 명시적 mapper 도입
- 검색·상세·동기화 API의 통합 테스트 추가
- 이미지 로딩 및 캐시 전략 고도화
- 사용자 로그인과 관심 콘텐츠 저장 기능 추가

## 라이선스 및 데이터 출처

이 프로젝트의 콘텐츠 메타데이터와 이미지는 TMDB API를 통해 제공됩니다. 실제 서비스 배포 시 TMDB의 이용 약관과 이미지 사용 정책을 확인해야 합니다.
