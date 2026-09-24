import { timingSafeEqual } from "node:crypto";

//* Vercel Cron은 환경 변수 CRON_SECRET이 있을 때 "Authorization: Bearer <값>"을 붙여 호출한다.
//* 비밀 값이 비어 있으면 "Bearer undefined" 같은 헤더로 통과되지 않도록 항상 거부한다.
export function isAuthorizedCronRequest(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
