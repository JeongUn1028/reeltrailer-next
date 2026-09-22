import type { MetadataRoute } from "next";
import providers from "@/config/ott-provider-ids.json";
import { getAllProgramRefs } from "@/server/contents";
import { programHref } from "@/app/lib/programUrls";

// 끝의 슬래시를 제거해 "https://host//path" 같은 URL이 생기지 않도록 함
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

//* 사이트맵은 카탈로그 캐시와 같은 주기로 갱신
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...Object.keys(providers).map((provider) => ({
      url: `${siteUrl}/${provider}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  // 상세 페이지: DB 조회에 실패해도 정적 항목은 내보낸다
  let programEntries: MetadataRoute.Sitemap = [];
  try {
    const programs = await getAllProgramRefs();
    programEntries = programs.map((program) => ({
      url: `${siteUrl}${programHref(program.id, program.mediaType)}`,
      lastModified: program.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("[sitemap] 프로그램 목록 조회 실패:", error);
  }

  return [...staticEntries, ...programEntries];
}
