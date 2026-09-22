import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import Tabs from "../tabs";

describe("Tabs", () => {
  it("OTT 링크를 렌더링하고 홈에서는 All이 활성", () => {
    usePathname.mockReturnValue("/");
    render(<Tabs />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Disney+" })).toHaveAttribute("href", "/disney-plus");
    expect(screen.getByRole("link", { name: "Netflix" })).not.toHaveAttribute("aria-current");
  });

  it("OTT 하위 경로(검색 등)에서도 해당 OTT가 활성", () => {
    usePathname.mockReturnValue("/tving/search");
    render(<Tabs />);
    expect(screen.getByRole("link", { name: "Tving" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });
});
