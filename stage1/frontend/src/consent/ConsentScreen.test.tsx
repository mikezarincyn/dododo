import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { t } from "../i18n";
import { ConsentScreen } from "./ConsentScreen";
import { REQUIRED_CHECKBOX_IDS } from "./consentConfig";

const stubResult = {
  session_id: "s",
  consent_id: "c",
  child_id: "0".repeat(32),
  display_code: "CH-AAAAAA",
  consent_version: "stage1_consent_v1",
  timestamp_utc: "2026-01-01T00:00:00+00:00",
};

const continueName = t().consent.continue;

describe("ConsentScreen", () => {
  it("renders 4 checkboxes, none pre-checked, Continue disabled", () => {
    render(<ConsentScreen submit={async () => stubResult} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    boxes.forEach((b) => expect(b).not.toBeChecked());
    expect(screen.getByRole("button", { name: continueName })).toBeDisabled();
  });

  it("enables Continue only after all 4 are checked", async () => {
    const user = userEvent.setup();
    render(<ConsentScreen submit={async () => stubResult} />);
    const boxes = screen.getAllByRole("checkbox");
    const btn = screen.getByRole("button", { name: continueName });
    for (let i = 0; i < boxes.length; i++) {
      await user.click(boxes[i]);
      if (i < boxes.length - 1) {
        expect(btn).toBeDisabled();
      }
    }
    expect(btn).toBeEnabled();
  });

  it("submits the checked ids when Continue is pressed", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => stubResult);
    render(<ConsentScreen submit={submit} />);
    for (const b of screen.getAllByRole("checkbox")) {
      await user.click(b);
    }
    await user.click(screen.getByRole("button", { name: continueName }));
    expect(submit).toHaveBeenCalledWith([...REQUIRED_CHECKBOX_IDS]);
  });

  it("does not render biometric or storage/retention checkboxes", () => {
    render(<ConsentScreen submit={async () => stubResult} />);
    expect(screen.queryByText(/biometric/i)).toBeNull();
    expect(screen.queryByText(/recalibrat/i)).toBeNull();
    expect(screen.queryByText(/stored for|retention|storage/i)).toBeNull();
  });
});
