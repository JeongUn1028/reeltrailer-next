// scripts/refresh-search-fields.ts
// 영문 제목(englishTitle)이 없는 콘텐츠의 en-US 제목을 TMDB에서 받아 채우고 searchText를 다시 계산한다.
// 백필 이후 1회 실행용 (항목당 요청 1개, 약 33,000건 기준 rps 40에서 15분 내외).
//
//   DATABASE_URL=... DIRECT_URL=... TMDB_API_KEY=... npm run refresh:search -- [--rps 40] [--only-missing]
//
//   --only-missing  englishTitle이 null인 행만 (기본). --all 이면 전부 다시 조회
import { PrismaClient } from "@prisma/client";
import { TmdbClient } from "../src/server/sync/tmdb";
import { buildSearchText } from "../src/server/search/normalize";
import { sleep } from "../src/server/sync/helpers";

const args = process.argv.slice(2);
const getArg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const rps = Number(getArg("rps") ?? 40);
const all = args.includes("--all");

async function main() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY 환경 변수가 필요합니다.");
  const prisma = new PrismaClient();
  const tmdb = new TmdbClient(apiKey);
  const batchSize = Math.max(1, Math.round(rps / 4));
  const delayMs = Math.round((batchSize * 1000) / rps);
  const startedAt = Date.now();
  let done = 0;
  let failed = 0;

  for (const kind of ["movie", "tv"] as const) {
    const where = all ? {} : { englishTitle: null };
    const rows =
      kind === "movie"
        ? await prisma.movie.findMany({ where, select: { id: true, title: true, originalTitle: true } })
        : await prisma.tvShow.findMany({ where, select: { id: true, title: true, originalTitle: true } });
    console.log(`${kind}: ${rows.length}건 처리 시작`);

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (row) => {
          try {
            const englishTitle = await tmdb.fetchEnglishTitle(kind, row.id);
            const searchText = buildSearchText({ title: row.title, originalTitle: row.originalTitle, englishTitle });
            if (kind === "movie") await prisma.movie.update({ where: { id: row.id }, data: { englishTitle, searchText } });
            else await prisma.tvShow.update({ where: { id: row.id }, data: { englishTitle, searchText } });
            done += 1;
          } catch (error) {
            failed += 1;
            console.error(`  ✗ ${kind}:${row.id} ${error instanceof Error ? error.message : error}`);
          }
        }),
      );
      if ((i / batchSize) % 25 === 0) {
        console.log(`  ${kind} ${Math.min(i + batchSize, rows.length)}/${rows.length} · ${((Date.now() - startedAt) / 60000).toFixed(1)}분`);
      }
      await sleep(delayMs);
    }
  }

  console.log(`\n완료: 갱신 ${done}, 실패 ${failed}, ${((Date.now() - startedAt) / 60000).toFixed(1)}분`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ 실패:", error);
  process.exit(1);
});
