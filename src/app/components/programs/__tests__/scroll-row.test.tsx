import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScrollRow from "../scroll-row";

//* jsdom에는 레이아웃이 없어 scrollWidth/clientWidth/scrollLeft를 흉내 낸다
function mockScroll(el: HTMLElement, { scrollWidth, clientWidth, scrollLeft }: { scrollWidth: number; clientWidth: number; scrollLeft: number }) {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(el, "scrollLeft", { configurable: true, value: scrollLeft, writable: true });
}

describe("ScrollRow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("이전/다음 버튼을 렌더링하고, 시작 위치에서는 이전 버튼이 비활성", () => {
    render(
      <ScrollRow label="테스트 행">
        <div>카드</div>
      </ScrollRow>,
    );
    const track = screen.getByTestId("scroll-track");
    mockScroll(track, { scrollWidth: 2000, clientWidth: 1000, scrollLeft: 0 });
    fireEvent.scroll(track);

    expect(screen.getByRole("button", { name: "테스트 행 이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "테스트 행 다음" })).toBeEnabled();
  });

  it("끝까지 스크롤하면 다음 버튼이 비활성", () => {
    render(
      <ScrollRow label="행">
        <div>카드</div>
      </ScrollRow>,
    );
    const track = screen.getByTestId("scroll-track");
    mockScroll(track, { scrollWidth: 2000, clientWidth: 1000, scrollLeft: 1000 });
    fireEvent.scroll(track);
    expect(screen.getByRole("button", { name: "행 다음" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "행 이전" })).toBeEnabled();
  });

  it("다음 버튼은 보이는 폭의 90%만큼 scrollBy 한다", async () => {
    const user = userEvent.setup();
    render(
      <ScrollRow label="행">
        <div>카드</div>
      </ScrollRow>,
    );
    const track = screen.getByTestId("scroll-track");
    mockScroll(track, { scrollWidth: 2000, clientWidth: 1000, scrollLeft: 0 });
    track.scrollBy = vi.fn();
    fireEvent.scroll(track);

    await user.click(screen.getByRole("button", { name: "행 다음" }));
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 900, behavior: "smooth" });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "행 이전" }));
    });
  });

  it("내용이 한 화면에 다 들어가면 버튼을 숨긴다", () => {
    render(
      <ScrollRow label="행">
        <div>카드</div>
      </ScrollRow>,
    );
    const track = screen.getByTestId("scroll-track");
    mockScroll(track, { scrollWidth: 800, clientWidth: 1000, scrollLeft: 0 });
    fireEvent.scroll(track);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
