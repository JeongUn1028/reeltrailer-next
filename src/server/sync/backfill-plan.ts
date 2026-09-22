//* 백필 실행 계획. TMDB discover가 쿼리당 최대 500페이지(10,000건)까지만 허용하므로
//* 연도 단위로 창(window)을 나눠 순회한다. 개봉일이 없는 항목은 마지막에 별도 창으로 처리한다.
import type { TmdbKind } from "./tmdb";

export interface BackfillWindow {
  id: string;
  kind: TmdbKind;
  label: string;
  dateParams: Record<string, string>;
  startPage: number;
}

export interface BackfillState {
  completed: string[];
  progress: Record<string, { nextPage: number }>;
}

const DATE_FIELD: Record<TmdbKind, string> = {
  movie: "primary_release_date",
  tv: "first_air_date",
};

//* 날짜 없는 항목: TMDB는 날짜가 없는 항목을 1899-12-31 이하 조건으로 잡아낼 수 있다
const UNDATED_LTE = "1899-12-31";

export function planBackfillWindows({
  fromYear,
  toYear,
  kinds = ["movie", "tv"],
}: {
  fromYear: number;
  toYear: number;
  kinds?: TmdbKind[];
}): BackfillWindow[] {
  const windows: BackfillWindow[] = [];
  for (let year = toYear; year >= fromYear; year--) {
    for (const kind of kinds) {
      windows.push({
        id: `${kind}:${year}`,
        kind,
        label: `${kind} ${year}`,
        dateParams: {
          [`${DATE_FIELD[kind]}.gte`]: `${year}-01-01`,
          [`${DATE_FIELD[kind]}.lte`]: `${year}-12-31`,
        },
        startPage: 1,
      });
    }
  }
  for (const kind of kinds) {
    windows.push({
      id: `${kind}:undated`,
      kind,
      label: `${kind} 날짜 없음`,
      dateParams: { [`${DATE_FIELD[kind]}.lte`]: UNDATED_LTE },
      startPage: 1,
    });
  }
  return windows;
}

//* 저장된 상태를 반영해 아직 남은 창만, 이어서 시작할 페이지와 함께 돌려준다
export function remainingWindows(windows: BackfillWindow[], state: BackfillState): BackfillWindow[] {
  const completed = new Set(state.completed);
  return windows
    .filter((w) => !completed.has(w.id))
    .map((w) => ({ ...w, startPage: state.progress[w.id]?.nextPage ?? 1 }));
}
