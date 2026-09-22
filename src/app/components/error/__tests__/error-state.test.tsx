import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorState from "../error-state";

describe("ErrorState", () => {
  it("제목, 설명, digest, 홈 링크를 렌더링하고 다시 시도를 호출한다", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState title="문제가 발생했습니다" description="설명" digest="abc" onRetry={onRetry} />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "문제가 발생했습니다" })).toBeInTheDocument();
    expect(screen.getByText("설명")).toBeInTheDocument();
    expect(screen.getByText("ref: abc")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /홈으로 돌아가기/ })).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("inline 변형은 h2를 쓰고, 옵션에 따라 버튼/링크를 숨긴다", () => {
    render(<ErrorState variant="inline" title="섹션 오류" showHomeLink={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "섹션 오류" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
