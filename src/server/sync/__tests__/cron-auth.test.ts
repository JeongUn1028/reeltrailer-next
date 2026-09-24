import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "../cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("Bearer 토큰이 비밀 값과 같으면 허용한다", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("토큰이 다르거나 헤더가 없으면 거부한다", () => {
    expect(isAuthorizedCronRequest("Bearer wrong", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest(null, "s3cret")).toBe(false);
  });

  it("비밀 값이 설정되지 않으면 어떤 헤더도 허용하지 않는다", () => {
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
});
