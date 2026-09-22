import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

afterEach(() => {
  cleanup();
});

// jsdom에는 scrollIntoView가 없다
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// next/image는 테스트 환경에서 최적화 로더가 없으므로 일반 <img>로 대체
vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean },
  ) => {
    // <img>에 없는 next/image 전용 prop은 제거
    const { fill, priority, sizes, src, alt, ...rest } = props;
    void fill;
    void priority;
    void sizes;
    return React.createElement("img", { src: String(src), alt, ...rest });
  },
}));

// next/navigation 훅은 App Router 컨텍스트가 필요하므로 기본 mock 제공 (테스트에서 override 가능)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
