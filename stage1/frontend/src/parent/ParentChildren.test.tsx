import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ParentChildren } from "./ParentChildren";
import type { ParentChild } from "../api/parent";
import { makeT } from "../i18n/strings";

const t = makeT("en");

const KIDS: ParentChild[] = [
  { child_id: "c1", display_code: "CH-AAAAAA", first_name: "Mia", birth_month: "March 2023", care_link: null },
  { child_id: "c2", display_code: "CH-BBBBBB", first_name: "Tom", birth_month: "2021-01", care_link: { ot_name: "Maya T.", status: "active" } },
];

describe("ParentChildren", () => {
  it("shows each child's private name, display_code and care-link status", () => {
    render(<ParentChildren t={t} go={() => {}} children={KIDS} />);
    expect(screen.getByText("Mia")).toBeInTheDocument();
    expect(screen.getByText("CH-AAAAAA")).toBeInTheDocument();
    expect(screen.getByText("No therapist yet")).toBeInTheDocument(); // Mia, unlinked
    expect(screen.getByText("Maya T.")).toBeInTheDocument(); // Tom, linked "With Maya T."
  });

  it("shows an empty state with an Add-a-child action when there are no children", () => {
    render(<ParentChildren t={t} go={() => {}} children={[]} />);
    expect(screen.queryByText("CH-AAAAAA")).toBeNull();
    expect(screen.getAllByRole("button", { name: t("parent.addChild") }).length).toBeGreaterThanOrEqual(1);
  });
});
