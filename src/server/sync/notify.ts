//* 동기화 결과를 웹훅(Discord/Slack incoming webhook 호환)으로 전송한다.
//* SYNC_WEBHOOK_URL이 없으면 아무것도 하지 않는다.

export interface SyncSummary {
  success: boolean;
  durationMs: number;
  movies?: { succeeded: number; failed: number; removed: number };
  tvShows?: { succeeded: number; failed: number; removed: number };
  errorSamples?: string[];
  message?: string;
}

export function formatSyncSummary(summary: SyncSummary): string {
  const status = summary.success ? "✅ TMDB 동기화 성공" : "❌ TMDB 동기화 실패";
  const lines = [`${status} (${(summary.durationMs / 1000).toFixed(1)}s)`];

  if (summary.movies) {
    const { succeeded, failed, removed } = summary.movies;
    lines.push(`영화: 성공 ${succeeded} / 실패 ${failed} / 삭제 ${removed}`);
  }
  if (summary.tvShows) {
    const { succeeded, failed, removed } = summary.tvShows;
    lines.push(`TV: 성공 ${succeeded} / 실패 ${failed} / 삭제 ${removed}`);
  }
  if (summary.message) {
    lines.push(summary.message);
  }
  if (summary.errorSamples && summary.errorSamples.length > 0) {
    lines.push("실패 예시:", ...summary.errorSamples.map((e) => `- ${e}`));
  }

  return lines.join("\n");
}

export async function notifySyncResult(summary: SyncSummary): Promise<void> {
  const webhookUrl = process.env.SYNC_WEBHOOK_URL;
  if (!webhookUrl) return;

  const text = formatSyncSummary(summary);
  try {
    // Discord는 content, Slack은 text 필드를 읽는다. 둘 다 넣어 양쪽 호환
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, text }),
    });
  } catch (error) {
    console.error("[sync] 웹훅 전송 실패:", error);
  }
}
