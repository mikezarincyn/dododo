import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ParentAddChild } from "./ParentAddChild";
import { makeT } from "../i18n/strings";

const t = makeT("en");

async function reachConsentStep(user: ReturnType<typeof userEvent.setup>, createChild = vi.fn(async () => ({ child_id: "x", display_code: "CH-TEST12" }))) {
  render(<ParentAddChild t={t} go={() => {}} createChild={createChild} onAdded={() => {}} />);
  await user.type(screen.getByPlaceholderText("e.g. Nora"), "Nora");
  await user.type(screen.getByPlaceholderText("e.g. March 2023"), "March 2023");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  return createChild;
}

describe("ParentAddChild consent", () => {
  it("uses no-retention wording, not 'stored securely', and keeps human-in-the-loop", async () => {
    const user = userEvent.setup();
    await reachConsentStep(user);
    expect(screen.getByText(/encrypted, visible only inside the care link, and deleted after review/i)).toBeInTheDocument();
    expect(screen.getByText(/never decides anything on its own/i)).toBeInTheDocument();
    expect(screen.queryByText(/stored securely/i)).toBeNull();
  });

  it("keeps 'I agree' disabled until all four consent boxes are checked", async () => {
    const user = userEvent.setup();
    await reachConsentStep(user);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    const agree = screen.getByRole("button", { name: /I agree/ });
    expect(agree).toBeDisabled();
    for (let i = 0; i < boxes.length; i++) {
      await user.click(boxes[i]);
      if (i < boxes.length - 1) expect(agree).toBeDisabled();
    }
    expect(agree).toBeEnabled();
  });

  it("creates the child with the four backend consent ids and shows the generated code", async () => {
    const user = userEvent.setup();
    const createChild = await reachConsentStep(user);
    for (const b of screen.getAllByRole("checkbox")) await user.click(b);
    await user.click(screen.getByRole("button", { name: /I agree/ }));
    expect(createChild).toHaveBeenCalledWith("Nora", "March 2023", [
      "guardian_authority",
      "specialist_review_feedback",
      "explicit_processing",
      "review_then_delete",
    ]);
    expect(await screen.findByText("CH-TEST12")).toBeInTheDocument();
  });
});
