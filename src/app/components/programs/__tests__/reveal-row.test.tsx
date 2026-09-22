import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RevealRow from "../reveal-row";

describe("RevealRow", () => {
  it("children을 항상 렌더링하고 기본은 등장 애니메이션 클래스를 붙인다", () => {
    const { container } = render(
      <RevealRow>
        <p>아래 행</p>
      </RevealRow>,
    );
    expect(screen.getByText("아래 행")).toBeInTheDocument();
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain("row");
    expect(row.className).toContain("animated");
  });

  it("eager이면 애니메이션 클래스를 붙이지 않는다", () => {
    const { container } = render(
      <RevealRow eager>
        <p>첫 행</p>
      </RevealRow>,
    );
    expect(screen.getByText("첫 행")).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).className).not.toContain("animated");
  });
});
