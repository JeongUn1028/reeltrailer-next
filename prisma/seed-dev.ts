// prisma/seed-dev.ts
// 로컬 개발/스크린샷용 가짜 콘텐츠 시드. 운영 DB에는 절대 실행하지 않는다.
// 실행: DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-dev.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 이미지는 next.config의 remotePatterns에 허용된 i.ytimg.com 썸네일을 사용한다 (실존하는 인기 영상 ID)
const VIDEO_IDS = [
  "dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "JGwWNGJdvx8", "RgKAFK5djSk",
  "OPf0YbXqDm0", "fJ9rUzIMcZQ", "hT_nvWreIhg", "CevxZvSJLk8", "YQHsXMglC9A",
  "09R8_2nJtjg", "pRpeEdMmmQ0", "60ItHLz5WEA", "e-ORhEE9VVg", "nfWlot6h_JM",
  "PT2_F-1esPk", "ru0K8uYEZWw", "7wtfhZwyrcc", "lp-EO5I60KA", "2Vv-BfVoq4g",
];

const PROVIDERS = [
  { id: 8, providerName: "Netflix", logoPath: null, displayPriority: 0 },
  { id: 337, providerName: "Disney Plus", logoPath: null, displayPriority: 1 },
  { id: 1883, providerName: "TVING", logoPath: null, displayPriority: 2 },
  { id: 97, providerName: "Watcha", logoPath: null, displayPriority: 3 },
  { id: 356, providerName: "wavve", logoPath: null, displayPriority: 4 },
];

const MOVIE_GENRES = [28, 12, 16, 35, 80, 18, 14, 27, 9648, 10749, 878, 53];
const TV_GENRES = [18, 35, 10759, 10765, 9648, 10764, 16, 80];

const MOVIE_TITLES = [
  ["기생충", "Parasite"], ["올드보이", "Oldboy"], ["부산행", "Train to Busan"], ["헤어질 결심", "Decision to Leave"],
  ["살인의 추억", "Memories of Murder"], ["아가씨", "The Handmaiden"], ["극한직업", "Extreme Job"], ["범죄도시", "The Outlaws"],
  ["신과함께", "Along with the Gods"], ["택시운전사", "A Taxi Driver"], ["밀양", "Secret Sunshine"], ["버닝", "Burning"],
  ["콘크리트 유토피아", "Concrete Utopia"], ["서울의 봄", "12.12: The Day"], ["파묘", "Exhuma"], ["곡성", "The Wailing"],
  ["추격자", "The Chaser"], ["황해", "The Yellow Sea"], ["암살", "Assassination"], ["베테랑", "Veteran"],
  ["국제시장", "Ode to My Father"], ["7번방의 선물", "Miracle in Cell No. 7"], ["도둑들", "The Thieves"], ["관상", "The Face Reader"],
  ["명량", "The Admiral"], ["괴물", "The Host"], ["마더", "Mother"], ["설국열차", "Snowpiercer"], ["옥자", "Okja"], ["밀정", "The Age of Shadows"],
];

const TV_TITLES = [
  ["오징어 게임", "Squid Game"], ["더 글로리", "The Glory"], ["이상한 변호사 우영우", "Extraordinary Attorney Woo"],
  ["킹덤", "Kingdom"], ["지금 우리 학교는", "All of Us Are Dead"], ["무빙", "Moving"], ["카지노", "Big Bet"],
  ["환승연애", "Transit Love"], ["술꾼도시여자들", "Work Later, Drink Now"], ["약한영웅", "Weak Hero Class 1"],
  ["D.P.", "D.P."], ["스위트홈", "Sweet Home"], ["사랑의 불시착", "Crash Landing on You"], ["미스터 션샤인", "Mr. Sunshine"],
  ["도깨비", "Guardian: The Lonely and Great God"], ["비밀의 숲", "Stranger"], ["시그널", "Signal"], ["나의 아저씨", "My Mister"],
  ["마스크걸", "Mask Girl"], ["경성크리처", "Gyeongseong Creature"], ["선재 업고 튀어", "Lovely Runner"], ["눈물의 여왕", "Queen of Tears"],
  ["피지컬: 100", "Physical: 100"], ["흑백요리사", "Culinary Class Wars"], ["악귀", "Revenant"],
];

const pick = <T,>(arr: T[], seed: number, count: number) => {
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(arr[(seed * 7 + i * 3) % arr.length]);
  return Array.from(new Set(out));
};

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main() {
  console.log("dev 시드 시작...");

  for (const provider of PROVIDERS) {
    await prisma.watchProvider.upsert({ where: { id: provider.id }, update: provider, create: provider });
  }

  for (let i = 0; i < MOVIE_TITLES.length; i++) {
    const [title, originalTitle] = MOVIE_TITLES[i];
    const video = VIDEO_IDS[i % VIDEO_IDS.length];
    const id = 100000 + i;
    const providers = pick(PROVIDERS, i, 1 + (i % 3)).map((p) => p.id);
    const genres = pick(MOVIE_GENRES, i, 2 + (i % 2));
    await prisma.movie.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title,
        originalTitle,
        overview: `${title}(${originalTitle})의 줄거리입니다. 로컬 개발용 가짜 데이터로, 실제 콘텐츠 정보와 무관합니다. 화면 레이아웃과 동작을 확인하기 위한 텍스트가 이어집니다.`,
        posterPath: `https://i.ytimg.com/vi/${video}/hqdefault.jpg`,
        backdropPath: `https://i.ytimg.com/vi/${video}/maxresdefault.jpg`,
        trailerKey: video,
        releaseDate: daysAgo(i < 6 ? i * 5 + 1 : 200 + i * 60),
        voteAverage: 6 + ((i * 37) % 35) / 10,
        voteCount: i % 5 === 0 ? 12 : 300 + i * 90,
        popularity: 1000 - i * 25,
        genres: { create: genres.map((genreId) => ({ genre: { connect: { id: genreId } } })) },
        providers: { create: providers.map((providerId) => ({ provider: { connect: { id: providerId } } })) },
      },
    });
  }

  for (let i = 0; i < TV_TITLES.length; i++) {
    const [title, originalTitle] = TV_TITLES[i];
    const video = VIDEO_IDS[(i + 7) % VIDEO_IDS.length];
    const id = 200000 + i;
    const providers = pick(PROVIDERS, i + 2, 1 + (i % 2)).map((p) => p.id);
    const genres = pick(TV_GENRES, i, 2);
    await prisma.tvShow.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title,
        originalTitle,
        overview: `${title}(${originalTitle})의 줄거리입니다. 로컬 개발용 가짜 데이터입니다.`,
        posterPath: `https://i.ytimg.com/vi/${video}/hqdefault.jpg`,
        backdropPath: `https://i.ytimg.com/vi/${video}/maxresdefault.jpg`,
        trailerKey: video,
        firstAirDate: daysAgo(i < 5 ? i * 7 + 2 : 150 + i * 45),
        voteAverage: 6.5 + ((i * 23) % 30) / 10,
        voteCount: 200 + i * 70,
        popularity: 980 - i * 30,
        genres: { create: genres.map((genreId) => ({ genre: { connect: { id: genreId } } })) },
        providers: { create: providers.map((providerId) => ({ provider: { connect: { id: providerId } } })) },
      },
    });
  }

  console.log(`dev 시드 완료: 영화 ${MOVIE_TITLES.length}, TV ${TV_TITLES.length}`);
}

main()
  .catch((e) => {
    console.error("❌ dev 시드 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
