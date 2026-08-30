import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header/header";
import Providers from "./provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "ReelTrailer",
    template: "%s | ReelTrailer",
  },
  description:
    "영화와 TV 프로그램을 탐색하고, 어떤 OTT 서비스에서 시청할 수 있는지 확인할 수 있는 콘텐츠 큐레이션 서비스",
  keywords: ["영화", "TV 프로그램", "OTT", "콘텐츠 큐레이션"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "ReelTrailer",
    title: "ReelTrailer",
    description:
      "영화와 TV 프로그램을 탐색하고 시청 가능한 OTT 서비스를 확인하세요.",
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-full flex flex-col">
        <SpeedInsights />
        <Providers>
          <Header />
          {children}
          {modal}
          <div id="modal-root"></div>
        </Providers>
      </body>
    </html>
  );
}
