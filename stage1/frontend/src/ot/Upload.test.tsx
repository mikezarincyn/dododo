import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Upload } from "./Upload";
import { makeT } from "../i18n/strings";

const t = makeT("en");
const CHILD = [{ value: "c1", label: "Mia · CH-AAAAAA" }];

function ok() {
  return vi.fn(async (_c: string, _s: string, _f: File, onP?: (p: number) => void) => {
    onP?.(50);
    onP?.(100);
    return { submission_id: "s1" };
  });
}

describe("Upload — two paths + feature detect", () => {
  it("falls back to native capture when in-window recording is unavailable (jsdom)", () => {
    render(<Upload t={t} go={() => {}} mode="parent" childOptions={CHILD} toast={() => {}} upload={ok()} />);
    // jsdom has no getUserMedia/MediaRecorder → recording unavailable message shown.
    expect(screen.getByText(/Recording isn't available/i)).toBeInTheDocument();
    // Both inputs exist; native record path keeps the capture attribute, file path doesn't.
    expect(screen.getByTestId("record-input")).toHaveAttribute("capture");
    expect(screen.getByTestId("file-input")).not.toHaveAttribute("capture");
  });

  it("shows the two paths with hierarchy (primary Record now + secondary Upload a file)", () => {
    render(<Upload t={t} go={() => {}} mode="ot" childOptions={CHILD} toast={() => {}} upload={ok()} />);
    expect(screen.getAllByText(t("upload.record.now")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(t("upload.record.haveFile")).length).toBeGreaterThanOrEqual(1);
  });

  it("uploads a chosen file with progress and navigates to the queue", async () => {
    const user = userEvent.setup();
    const upload = ok();
    const go = vi.fn();
    const onUploaded = vi.fn();
    const toast = vi.fn();
    render(<Upload t={t} go={go} mode="parent" childOptions={CHILD} toast={toast} onUploaded={onUploaded} upload={upload} />);

    // child auto-selected (single option); choose a scenario (2nd combobox).
    await user.selectOptions(screen.getAllByRole("combobox")[1], "name");
    const f = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
    await user.upload(screen.getByTestId("file-input"), f);

    expect(upload).toHaveBeenCalledWith("c1", "name", expect.any(File), expect.any(Function));
    await waitFor(() => expect(go).toHaveBeenCalledWith("queue"));
    expect(onUploaded).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it("shows an error with retry when upload fails, then succeeds on retry", async () => {
    const user = userEvent.setup();
    let n = 0;
    const upload = vi.fn(async (_c: string, _s: string, _f: File, onP?: (p: number) => void) => {
      n += 1;
      if (n === 1) throw new Error("network");
      onP?.(100);
      return { submission_id: "s2" };
    });
    const go = vi.fn();
    render(<Upload t={t} go={go} mode="parent" childOptions={CHILD} toast={() => {}} upload={upload} />);
    await user.selectOptions(screen.getAllByRole("combobox")[1], "name");
    await user.upload(screen.getByTestId("file-input"), new File([new Uint8Array([1])], "clip.mp4", { type: "video/mp4" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: t("upload.retry") }));
    await waitFor(() => expect(go).toHaveBeenCalledWith("queue"));
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
