import { describe, expect, it } from "vitest";

import { ageFromBirthMonth } from "./age";

const NOW = new Date("2026-06-14T00:00:00Z");

describe("ageFromBirthMonth", () => {
  it("parses 'Month YYYY'", () => {
    expect(ageFromBirthMonth("March 2023", NOW)).toEqual({ y: 3, m: 3 });
  });
  it("parses ISO 'YYYY-MM'", () => {
    expect(ageFromBirthMonth("2023-03", NOW)).toEqual({ y: 3, m: 3 });
  });
  it("parses abbreviated month", () => {
    expect(ageFromBirthMonth("Jan 2021", NOW)).toEqual({ y: 5, m: 5 });
  });
  it("returns null for unparseable input", () => {
    expect(ageFromBirthMonth("sometime")).toBeNull();
    expect(ageFromBirthMonth("")).toBeNull();
  });
  it("never returns a negative age", () => {
    expect(ageFromBirthMonth("March 2099", NOW)).toEqual({ y: 0, m: 0 });
  });
});
