import { describe, expect, it } from "vitest";

import { REQUIRED_CHECKBOX_IDS } from "./consentConfig";
import { allRequiredChecked } from "./consentGate";

const noneChecked = () =>
  Object.fromEntries(REQUIRED_CHECKBOX_IDS.map((id) => [id, false]));

describe("allRequiredChecked", () => {
  it("false when none checked", () => {
    expect(allRequiredChecked(noneChecked(), REQUIRED_CHECKBOX_IDS)).toBe(false);
  });

  it("false when some but not all checked", () => {
    const state = noneChecked();
    state[REQUIRED_CHECKBOX_IDS[0]] = true;
    state[REQUIRED_CHECKBOX_IDS[1]] = true;
    expect(allRequiredChecked(state, REQUIRED_CHECKBOX_IDS)).toBe(false);
  });

  it("true only when all four checked", () => {
    const state = Object.fromEntries(REQUIRED_CHECKBOX_IDS.map((id) => [id, true]));
    expect(allRequiredChecked(state, REQUIRED_CHECKBOX_IDS)).toBe(true);
  });
});
