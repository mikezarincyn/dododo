import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Annotation } from "./Annotation";
import { AN_ITEMS } from "../data/reference";
import { makeT } from "../i18n/strings";
import type { AnalysisBundle, AnnotatePayload, Observation } from "../api/ot";
import type { QueueRow } from "./Queue";

const t = makeT("en");
const ITEM: QueueRow = { submission_id: "s1", display_code: "CH-AAAAAA", scenario: "name", size_bytes: 1, state: "ready", created_at: "" };

const BUNDLE: AnalysisBundle = {
  version: 1, scenario: "name", fps: 15, duration_s: 3, coverage_pct: 80,
  series: { head_turn: { t: [0, 1, 2, 3], v: [0.1, 0.5, null, 0.3] }, hand_movement: { t: [0, 1, 2, 3], v: [0, 0.2, 0.4, 0.1] } },
  events: { calls: [1.2], words: [{ t: 0.8, end: 1.1, text: "Mia" }], movement_peaks: [2.0] },
  latencies: [{ call_t: 1.2, latency_s: 0.4 }],
  checklist_hints: { turn: { value: "yes", basis: "head-turn 0.4 s after a call" } },
};

function setup(opts: { loadVideo?: () => Promise<Blob>; loadAnalysis?: () => Promise<AnalysisBundle>; loadOverlay?: () => Promise<Blob> } = {}) {
  const loadVideo = opts.loadVideo ?? vi.fn(async () => new Blob(["v"], { type: "video/mp4" }));
  const loadAnalysis = opts.loadAnalysis ?? vi.fn(async () => BUNDLE);
  const loadOverlay = opts.loadOverlay ?? vi.fn(async () => new Blob(["sk"], { type: "video/mp4" }));
  const annotate = vi.fn(async (_submissionId: string, _payload: AnnotatePayload): Promise<Observation> => ({
    id: "o1", child_id: "c1", display_code: "CH-AAAAAA", scenario: "name", domains: ["attention"],
    duration: "1:42", summary: "", notes: "", metrics: [], domain_scores: {}, created_at: "",
  }));
  const go = vi.fn();
  render(<Annotation t={t} go={go} item={ITEM} annotate={annotate} loadVideo={loadVideo} loadAnalysis={loadAnalysis} loadOverlay={loadOverlay} toast={() => {}} />);
  return { annotate, go, loadVideo, loadAnalysis, loadOverlay };
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

describe("Annotation anti-anchoring + real engine hints", () => {
  it("hides the suggestion until the OT answers, then shows the REAL engine hint", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryAllByText(t("annot.reveal"))).toHaveLength(0);
    expect(screen.queryByText(new RegExp(t("annot.suggestion")))).toBeNull();

    // Answer item 1 ("turn", which has a bundle hint) → reveal link appears for it.
    const firstSeg = document.querySelector(".seg");
    await user.click(firstSeg!.querySelector("button")!);
    expect(screen.getAllByText(t("annot.reveal"))).toHaveLength(1);

    // Revealing shows the engine hint + its basis, badged in-calibration.
    await user.click(screen.getAllByText(t("annot.reveal"))[0]);
    await waitFor(() => expect(screen.getByText(new RegExp(t("annot.suggestion")))).toBeInTheDocument());
    expect(screen.getByText(t("status.inCalibration"))).toBeInTheDocument();
    expect(screen.getByText(/head-turn 0\.4 s after a call/)).toBeInTheDocument();
  });

  it("shows NO hint (not a demo value) for items the engine can't justify", async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(document.querySelector('[aria-label="signal over time"]')).not.toBeNull());
    // Item 2 ("eye") has no bundle hint → reveal shows the neutral no-hint note.
    const segs = document.querySelectorAll(".seg");
    await user.click(segs[1].querySelector("button")!);
    await user.click(screen.getAllByText(t("annot.reveal"))[0]);
    expect(screen.getByText(t("annot.noHint"))).toBeInTheDocument();
  });

  it("saves only OT-confirmed metrics — no fabricated calibration metric", async () => {
    const user = userEvent.setup();
    const { annotate, go } = setup();
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: t("annot.save") }));
    expect(annotate).toHaveBeenCalledTimes(1);
    const payload = annotate.mock.calls[0][1];
    expect(payload.metrics.length).toBe(AN_ITEMS.length);
    expect(payload.metrics.every((m) => m.state === "confirmed")).toBe(true);
    expect(go).toHaveBeenCalledWith("progress", { childId: "c1" });
  });
});

describe("Annotation analysis visualization", () => {
  it("streams the real clip into a <video> player (not a placeholder)", async () => {
    const loadVideo = vi.fn(async () => new Blob(["v"], { type: "video/mp4" }));
    setup({ loadVideo });
    expect(loadVideo).toHaveBeenCalledWith("s1");
    await waitFor(() => expect(document.querySelector('video[data-testid="annot-video"]')).not.toBeNull());
  });

  it("renders the synced signal chart + a clickable transcript from the bundle", async () => {
    setup();
    await waitFor(() => expect(document.querySelector('[aria-label="signal over time"]')).not.toBeNull());
    // Recognized word from the bundle is shown (clickable transcript track).
    expect(screen.getByText("Mia")).toBeInTheDocument();
  });

  it("overlay toggle loads the skeleton overlay (OT-only)", async () => {
    const user = userEvent.setup();
    const { loadOverlay } = setup();
    await waitFor(() => expect(screen.getByRole("button", { name: t("annot.overlay.show") })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: t("annot.overlay.show") }));
    expect(loadOverlay).toHaveBeenCalledWith("s1");
  });

  it("still works (manual annotation) when no analysis bundle is available", async () => {
    const loadAnalysis = vi.fn(async () => { throw new Error("410"); });
    setup({ loadAnalysis });
    await waitFor(() => expect(document.querySelector('video[data-testid="annot-video"]')).not.toBeNull());
    // No chart, but the checklist is present.
    expect(document.querySelector('[aria-label="signal over time"]')).toBeNull();
    expect(screen.getByText(t("annot.checklist"))).toBeInTheDocument();
  });

  it("shows an error if the clip is gone", async () => {
    setup({ loadVideo: vi.fn(async () => { throw new Error("410"); }) });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(t("annot.videoError")));
  });
});
