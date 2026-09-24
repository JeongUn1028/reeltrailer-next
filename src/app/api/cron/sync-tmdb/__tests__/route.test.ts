import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/sync-tmdb", {
    headers: authorization ? { authorization } : {},
  });

describe("GET /api/cron/sync-tmdb 인증", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("CRON_SECRET이 설정되지 않으면 'Bearer undefined' 헤더도 401로 거부한다", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(request("Bearer undefined"));
    expect(response.status).toBe(401);
  });

  it("예전 이름인 CRON_SECRET_KEY 값으로는 인증되지 않는다", async () => {
    vi.stubEnv("CRON_SECRET", "new-secret");
    vi.stubEnv("CRON_SECRET_KEY", "old-secret");
    const response = await GET(request("Bearer old-secret"));
    expect(response.status).toBe(401);
  });

  it("CRON_SECRET과 일치하면 인증을 통과해 다음 단계로 진행한다", async () => {
    vi.stubEnv("CRON_SECRET", "new-secret");
    vi.stubEnv("TMDB_API_KEY", "");
    const response = await GET(request("Bearer new-secret"));
    // 인증 다음 단계인 TMDB 키 확인에서 멈춘다 (DB·외부 호출 없음)
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "TMDB API Key is not set" });
  });
});
