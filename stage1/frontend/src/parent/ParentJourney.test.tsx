import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ParentJourney } from "./ParentJourney";
import { makeT } from "../i18n/strings";
import type { QueueRow } from "../ot/Queue";

const t = makeT("en");

function row(over: Partial<QueueRow> = {}): QueueRow {
  return { submission_id: "s1", display_code: "CH-AAAAAA", scenario: "name", size_bytes: 1, state: "ready", recording_quality: "good", created_at: "", ...over };
}

describe("ParentJourney (safe parent layer)", () => {
  it("shows the processing journey + recording quality, NEVER metrics/graphs/skeleton", () => {
    render(<ParentJourney t={t} item={row()} ordinal={3} />);
    // Journey steps + reassurance + neutral recording feedback.
    expect(screen.getByText(t("parent.safe.step.received"))).toBeInTheDocument();
    expect(screen.getByText(t("parent.safe.step.specialist"))).toBeInTheDocument();
    expect(screen.getByText(t("parent.safe.specialistHas"))).toBeInTheDocument();
    expect(screen.getByText(t("parent.safe.quality.good"))).toBeInTheDocument();
    expect(screen.getByText(/#3/)).toBeInTheDocument();
    // No signal/skeleton viz reaches the parent.
    expect(document.querySelector('[aria-label="signal over time"]')).toBeNull();
    expect(document.querySelector("video")).toBeNull();
  });

  it("shows a gentle re-upload message on failure (no blame, no data)", () => {
    render(<ParentJourney t={t} item={row({ state: "failed", recording_quality: null })} />);
    expect(screen.getByText(t("parent.safe.failed"))).toBeInTheDocument();
    expect(screen.queryByText(t("parent.safe.quality.good"))).toBeNull();
  });

  it("while processing shows the journey without the specialist-has note", () => {
    render(<ParentJourney t={t} item={row({ state: "processing", recording_quality: null })} />);
    expect(screen.getByText(t("parent.safe.processingNote"))).toBeInTheDocument();
    expect(screen.queryByText(t("parent.safe.specialistHas"))).toBeNull();
  });
});
