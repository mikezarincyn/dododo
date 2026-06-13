import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewPanel } from "./ReviewPanel";

const makeBlob = () => new Blob([new Uint8Array([1, 2, 3])], { type: "video/mp4" });

describe("ReviewPanel", () => {
  it("plays video inline with download disabled and no download affordance", async () => {
    render(
      <ReviewPanel
        submissionId="s1"
        displayCode="CH-AAAAAA"
        loadVideo={async () => makeBlob()}
        submitFeedback={async () => {}}
      />,
    );
    const video = await screen.findByTestId("review-video");
    // controlsList отключает кнопку скачивания у нативного плеера.
    expect(video.getAttribute("controlsList")).toContain("nodownload");
    expect(video).toHaveAttribute("disablePictureInPicture");
    // Нет кнопки/ссылки скачивания.
    expect(screen.queryByText(/download/i)).toBeNull();
    expect(document.querySelectorAll("a[download]").length).toBe(0);
    expect(document.querySelectorAll("a[href]").length).toBe(0);
  });

  it("submits the feedback note via the injected handler", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => {});
    render(
      <ReviewPanel
        submissionId="s1"
        displayCode="CH-AAAAAA"
        loadVideo={async () => makeBlob()}
        submitFeedback={submit}
      />,
    );
    await screen.findByTestId("review-video");
    await user.type(screen.getByRole("textbox"), "calm and engaged");
    await user.click(screen.getByRole("button", { name: /save feedback/i }));
    expect(submit).toHaveBeenCalledWith("s1", "calm and engaged");
  });

  it("keeps Save disabled until a note is entered", async () => {
    render(
      <ReviewPanel
        submissionId="s1"
        displayCode="CH-AAAAAA"
        loadVideo={async () => makeBlob()}
        submitFeedback={async () => {}}
      />,
    );
    await screen.findByTestId("review-video");
    expect(screen.getByRole("button", { name: /save feedback/i })).toBeDisabled();
  });
});
