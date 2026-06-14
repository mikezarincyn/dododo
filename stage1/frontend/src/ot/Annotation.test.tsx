import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Annotation } from "./Annotation";
import { AN_ITEMS } from "../data/reference";
import { makeT } from "../i18n/strings";
import type { AnnotatePayload, Observation } from "../api/ot";
import type { QueueRow } from "./Queue";

const t = makeT("en");
const ITEM: QueueRow = { submission_id: "s1", display_code: "CH-AAAAAA", scenario: "name", size_bytes: 1, state: "ready", created_at: "" };

function setup(loadVideo = vi.fn(async () => new Blob(["v"], { type: "video/mp4" }))) {
  const annotate = vi.fn(async (_submissionId: string, _payload: AnnotatePayload): Promise<Observation> => ({
    id: "o1", child_id: "c1", display_code: "CH-AAAAAA", scenario: "name", domains: ["attention"],
    duration: "1:42", summary: "", notes: "", metrics: [], domain_scores: {}, created_at: "",
  }));
  const go = vi.fn();
  render(<Annotation t={t} go={go} item={ITEM} annotate={annotate} loadVideo={loadVideo} toast={() => {}} />);
  return { annotate, go, loadVideo };
}

function answerAll(user: ReturnType<typeof userEvent.setup>) {
  const segs = Array.from(document.querySelectorAll(".seg"));
  return Promise.all([]).then(async () => {
    for (const seg of segs) {
      const first = seg.querySelector("button");
      if (first) await user.click(first);
    }
  });
}

describe("Annotation anti-anchoring", () => {
  it("hides the AI suggestion until the OT has answered that item", async () => {
    const user = userEvent.setup();
    setup();
    // Before answering anything: no reveal links, no suggestion text.
    expect(screen.queryAllByText(t("annot.reveal"))).toHaveLength(0);
    expect(screen.queryByText(new RegExp(t("annot.suggestion")))).toBeNull();

    // Answer the first item only → a reveal link appears for it (and only it).
    const firstSeg = document.querySelector(".seg");
    await user.click(firstSeg!.querySelector("button")!);
    expect(screen.getAllByText(t("annot.reveal"))).toHaveLength(1);

    // Revealing shows the suggestion, badged in-calibration.
    await user.click(screen.getAllByText(t("annot.reveal"))[0]);
    expect(screen.getByText(new RegExp(t("annot.suggestion")))).toBeInTheDocument();
    expect(screen.getByText(t("status.inCalibration"))).toBeInTheDocument();
  });

  it("keeps Save disabled until every item is answered", async () => {
    const user = userEvent.setup();
    setup();
    const save = screen.getByRole("button", { name: t("annot.save") });
    expect(save).toBeDisabled();
    await answerAll(user);
    expect(screen.getAllByText(t("annot.reveal"))).toHaveLength(AN_ITEMS.length);
    expect(save).toBeEnabled();
  });

  it("saves confirmed metrics from answers plus an in-calibration auto-metric", async () => {
    const user = userEvent.setup();
    const { annotate, go } = setup();
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: t("annot.save") }));
    expect(annotate).toHaveBeenCalledTimes(1);
    const payload = annotate.mock.calls[0][1];
    expect(payload.metrics.filter((m) => m.state === "confirmed").length).toBeGreaterThanOrEqual(AN_ITEMS.length);
    expect(payload.metrics.some((m) => m.state === "calibration")).toBe(true);
    expect(go).toHaveBeenCalledWith("progress", { childId: "c1" });
  });

  it("streams the real clip into a <video> player (not a placeholder)", async () => {
    const loadVideo = vi.fn(async () => new Blob(["v"], { type: "video/mp4" }));
    setup(loadVideo);
    expect(loadVideo).toHaveBeenCalledWith("s1");
    await waitFor(() => expect(document.querySelector('video[data-testid="annot-video"]')).not.toBeNull());
  });

  it("shows an error if the clip is gone", async () => {
    setup(vi.fn(async () => { throw new Error("410"); }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(t("annot.videoError")));
  });
});
