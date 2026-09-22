import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

import Modal from "../modal";

describe("Modal", () => {
  it("dialog 안에 children과 닫기 버튼을 렌더링하고, 닫기를 누르면 router.back()", async () => {
    // jsdom에는 showModal이 없으므로 stub
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.scrollTo = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    });

    const user = userEvent.setup();
    render(
      <Modal>
        <p>내용</p>
      </Modal>,
    );

    expect(screen.getByText("내용")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(back).toHaveBeenCalled();
  });
});
