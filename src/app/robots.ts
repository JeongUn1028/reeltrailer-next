import type { MetadataRoute } from "next";

// 끝의 슬래시를 제거해 "https://host//path" 같은 URL이 생기지 않도록 함
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/search", "/browse"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
