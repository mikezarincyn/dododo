import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { t } from "../i18n";
import { DemoBanner } from "./DemoBanner";

describe("DemoBanner", () => {
  it("renders the DEMO sample-data-only banner text", () => {
    render(<DemoBanner />);
    expect(screen.getByText(t().common.demoBanner)).toBeInTheDocument();
    expect(t().common.demoBanner).toContain("not for real children's videos");
  });
});
