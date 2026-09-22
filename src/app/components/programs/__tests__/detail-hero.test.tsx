import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DetailHero from "../detail-hero";

const heading = <h1>기생충</h1>;

describe("DetailHero", () => {
  it("backdrop 위에 제목 오버레이와 예고편 재생 버튼을 보여준다", () => {
    render(
      <DetailHero backdropSrc="https://img/b.jpg" posterSrc={null} trailerKey="abc" title="기생충">
        {heading}
      </DetailHero>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "기생충" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기생충 예고편 재생" })).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://img/b.jpg");
  });

  it("재생하면 iframe이 히어로를 채우고 오버레이는 숨겨지며, 닫기로 되돌릴 수 있다", async () => {
    const user = userEvent.setup();
    render(
      <DetailHero backdropSrc="https://img/b.jpg" posterSrc={null} trailerKey="abc" title="기생충">
        {heading}
      </DetailHero>,
    );
    await user.click(screen.getByRole("button", { name: "기생충 예고편 재생" }));

    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain("/embed/abc");
    expect(iframe?.getAttribute("src")).toContain("autoplay=1");
    // 제목은 DOM에 남아 있되(접근성) 시각적으로는 숨김
    expect(screen.getByRole("heading", { level: 1, hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "기생충 예고편 재생" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "예고편 닫기" }));
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "기생충 예고편 재생" })).toBeInTheDocument();
  });

  it("예고편이 없으면 재생 버튼 없이 backdrop만, backdrop도 없으면 포스터를 배경으로 쓴다", () => {
    render(
      <DetailHero backdropSrc={null} posterSrc="https://img/p.jpg" trailerKey={null} title="기생충">
        {heading}
      </DetailHero>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://img/p.jpg");
  });
});
