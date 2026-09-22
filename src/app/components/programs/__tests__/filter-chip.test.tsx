import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const linkStatus = { pending: false };
vi.mock("next/link", async () => {
  const actual = await vi.importActual<typeof import("next/link")>("next/link");
  return { ...actual, useLinkStatus: () => linkStatus };
});

import FilterChip from "../filter-chip";

describe("FilterChip", () => {
  it("활성 칩은 aria-current를 갖고, pending이면 data-pending을 붙인다", () => {
    linkStatus.pending = false;
    const { rerender } = render(<FilterChip href="/browse?kind=movie" active>영화</FilterChip>);
    const link = screen.getByRole("link", { name: "영화" });
    expect(link).toHaveAttribute("aria-current", "true");
    expect(link.querySelector("[data-pending]")).toBeNull();

    linkStatus.pending = true;
    rerender(<FilterChip href="/browse?kind=movie" active={false}>영화</FilterChip>);
    expect(screen.getByRole("link", { name: "영화" }).querySelector("[data-pending='true']")).not.toBeNull();
    expect(screen.getByRole("link", { name: "영화" })).not.toHaveAttribute("aria-current");
  });
});
