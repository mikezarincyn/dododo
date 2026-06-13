import { describe, expect, it } from "vitest";

import { t } from "../i18n";
import { HIDDEN_CHECKBOX_IDS, REQUIRED_CHECKBOX_IDS } from "./consentConfig";

describe("consent config", () => {
  it("has exactly 4 required ids, none of which are hidden", () => {
    expect(REQUIRED_CHECKBOX_IDS).toHaveLength(4);
    for (const hidden of HIDDEN_CHECKBOX_IDS) {
      expect(REQUIRED_CHECKBOX_IDS as readonly string[]).not.toContain(hidden);
    }
  });

  it("i18n has a string for every required id (texts live in i18n only)", () => {
    const boxes = t().consent.checkboxes as Record<string, string>;
    for (const id of REQUIRED_CHECKBOX_IDS) {
      expect(typeof boxes[id]).toBe("string");
      expect(boxes[id].length).toBeGreaterThan(0);
    }
  });

  it("checkbox 1 text is verbatim", () => {
    expect(t().consent.checkboxes.guardian_authority).toBe(
      "I confirm I am the parent or legal guardian of the child in this video and I have the authority to provide this video.",
    );
  });

  it("hidden ids (biometric / retention) have NO i18n text", () => {
    const boxes = t().consent.checkboxes as Record<string, string>;
    for (const hidden of HIDDEN_CHECKBOX_IDS) {
      expect(boxes[hidden]).toBeUndefined();
    }
  });
});
