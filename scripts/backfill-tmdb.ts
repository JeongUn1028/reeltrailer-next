// scripts/backfill-tmdb.ts
// 전체 기간의 국내 OTT 구독형 콘텐츠를 TMDB에서 받아 DB에 넣는 1회성 백필 스크립트.
// Vercel 함수 시간 제한과 무관하게 로컬에서 실행한다. 중단해도 상태 파일로 이어서 실행할 수 있다.
//
// 실행:
//   DATABASE_URL=... DIRECT_URL=... TMDB_API_KEY=... npm run backfill -- [--from 1900] [--to 2026] [--kinds movie,tv] [--rps 25] [--reset]
//
// 옵션:
//   --from   시작 연도 (기본 1900)          --to     끝 연도 (기본 올해)
//   --kinds  movie,tv 중 선택 (기본 둘 다)   --rps    초당 요청 수 상한 (기본 25, TMDB 소프트 리밋 ~40)
//   --reset  상태 파일을 지우고 처음부터        --state  상태 파일 경로 (기본 .backfill-state.json)
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { TmdbClient, DISCOVER_MAX_PAGE, type TmdbKind, type TMDBMovie, type TMDBTVShow } from "../src/server/sync/tmdb";
import { processMovie, processTvShow, syncGenres } from "../src/server/sync/process";
import { planBackfillWindows, remainingWindows, type BackfillState } from "../src/server/sync/backfill-plan";
import { NETFLIX_WITH_ADS_PROVIDER_ID, sleep } from "../src/server/sync/helpers";

type Args = { from: number; to: number; kinds: TmdbKind[]; rps: number; reset: boolean; state: string };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const kinds = (get("kinds") ?? "movie,tv").split(",").filter((k): k is TmdbKind => k === "movie" || k === "tv");
  return {
    from: Number(get("from") ?? 1900),
    to: Number(get("to") ?? new Date().getFullYear()),
    kinds,
    rps: Number(get("rps") ?? 25),
    reset: argv.includes("--reset"),
    state: get("state") ?? ".backfill-state.json",
  };
}

function loadState(file: string, reset: boolean): BackfillState {
  if (reset || !fs.existsSync(file)) return { completed: [], progress: {} };
  return JSON.parse(fs.readFileSync(file, "utf8")) as BackfillState;
}

function saveState(file: string, state: BackfillState) {
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY 환경 변수가 필요합니다.");

  const prisma = new PrismaClient();
  const tmdb = new TmdbClient(apiKey);
  const deps = { prisma, tmdb };
  const stateFile = path.resolve(args.state);
  const state = loadState(stateFile, args.reset);

  // 항목 1건 ≈ 요청 2.5개. rps 상한에 맞춰 동시 처리 개수와 배치 간격을 정한다
  const batchSize = Math.max(1, Math.round(args.rps / 5));
  const batchDelayMs = Math.round((batchSize * 2.5 * 1000) / args.rps);

  console.log(`백필 시작: ${args.from}~${args.to}, kinds=${args.kinds.join(",")}, rps≈${args.rps} (batch ${batchSize}/${batchDelayMs}ms)`);
  console.log(`장르 동기화: ${await syncGenres(deps)}개`);

  const windows = remainingWindows(planBackfillWindows({ fromYear: args.from, toYear: args.to, kinds: args.kinds }), state);
  const totals = { saved: 0, skipped: 0, failed: 0, requests: 0 };
  const startedAt = Date.now();

  for (const window of windows) {
    let page = window.startPage;
    let totalPages = DISCOVER_MAX_PAGE;
    let windowSaved = 0;

    while (page <= totalPages && page <= DISCOVER_MAX_PAGE) {
      const data = await tmdb.discoverPage(window.kind, page, window.dateParams);
      totals.requests += 1;
      totalPages = Math.min(DISCOVER_MAX_PAGE, data.total_pages ?? 1);
      const items = data.results ?? [];
      if (items.length === 0) break;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (item) => {
            try {
              const outcome =
                window.kind === "movie"
                  ? await processMovie(deps, item as TMDBMovie)
                  : await processTvShow(deps, item as TMDBTVShow);
              totals.requests += outcome === "saved" ? 3 : 1;
              if (outcome === "saved") {
                totals.saved += 1;
                windowSaved += 1;
              } else totals.skipped += 1;
            } catch (error) {
              totals.failed += 1;
              console.error(`  ✗ ${window.kind}:${item.id} ${error instanceof Error ? error.message : error}`);
            }
          }),
        );
        await sleep(batchDelayMs);
      }

      state.progress[window.id] = { nextPage: page + 1 };
      saveState(stateFile, state);

      if (page % 10 === 0 || page === totalPages) {
        const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
        console.log(`  ${window.label} ${page}/${totalPages}p · 저장 ${totals.saved} / 제외 ${totals.skipped} / 실패 ${totals.failed} · ${mins}분`);
      }
      page += 1;
    }

    state.completed.push(window.id);
    delete state.progress[window.id];
    saveState(stateFile, state);
    console.log(`✓ ${window.label} 완료 (저장 ${windowSaved})`);
  }

  await prisma.watchProvider.deleteMany({ where: { id: NETFLIX_WITH_ADS_PROVIDER_ID } });

  const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`\n백필 완료: 저장 ${totals.saved}, 제외(국내 OTT 없음) ${totals.skipped}, 실패 ${totals.failed}, 요청 약 ${totals.requests}건, ${mins}분`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ 백필 실패:", error);
  process.exit(1);
});
