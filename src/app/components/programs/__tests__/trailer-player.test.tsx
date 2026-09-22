import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrailerPlayer from "../trailer-player";

describe("TrailerPlayer", () => {
  it("클릭 전에는 썸네일 버튼만, 클릭 후 YouTube iframe을 로드한다", async () => {
    const user = userEvent.setup();
    render(<TrailerPlayer trailerKey="abc123" title="테스트" posterSrc="https://img/x.jpg" />);

    const button = screen.getByRole("button", { name: "테스트 예고편 재생" });
    expect(button).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://img/x.jpg");

    await user.click(button);

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("youtube-nocookie.com/embed/abc123");
    expect(iframe?.getAttribute("src")).toContain("autoplay=1");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("posterSrc가 없으면 YouTube 썸네일을 사용한다", () => {
    render(<TrailerPlayer trailerKey="abc123" title="테스트" />);
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
  });
});
