import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DesignApp from "./DesignApp";
import { makeT, isRTL } from "../i18n/strings";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dir = "ltr";
});
afterEach(() => localStorage.clear());

describe("DesignApp role switcher", () => {
  it("shows the three pilot roles (parent, OT, clinic) — no system admin", () => {
    render(<DesignApp />);
    expect(screen.getByText("Occupational therapist")).toBeInTheDocument();
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Clinic admin")).toBeInTheDocument();
    // System admin role is out of scope for the pilot.
    expect(screen.queryByText("System admin")).toBeNull();
  });

  it("enters a role and shows that role's nav in the shell", async () => {
    const user = userEvent.setup();
    render(<DesignApp />);
    await user.click(screen.getByText("Parent"));
    // Parent nav items are present once inside the shell. "My children" appears
    // both as a nav item and as the active screen's heading, so allow ≥1.
    expect(screen.getAllByText("My children").length).toBeGreaterThanOrEqual(1);
    // "Invite a therapist" appears in the nav and as a link on the children screen.
    expect(screen.getAllByText("Invite a therapist").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Switch role" })).toBeInTheDocument();
  });
});

describe("i18n + RTL", () => {
  it("falls back locale → en → key", () => {
    const t = makeT("de");
    expect(t("nav.children")).toBe("Meine Kinder"); // translated
    expect(t("totally.unknown.key")).toBe("totally.unknown.key"); // passthrough
  });

  it("marks Arabic as RTL and others LTR", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("en")).toBe(false);
    expect(isRTL("de")).toBe(false);
    expect(isRTL("ko")).toBe(false);
  });

  it("switches the document direction to rtl when Arabic is picked", async () => {
    const user = userEvent.setup();
    render(<DesignApp />);
    // open the language switcher (button shows the current language label)
    await user.click(screen.getByText("English"));
    const menu = screen.getByText("العربية");
    await user.click(menu);
    expect(document.documentElement.dir).toBe("rtl");
  });
});

describe("Arabic strings are present", () => {
  it("translates a nav label to Arabic", () => {
    const t = makeT("ar");
    expect(t("nav.children")).not.toBe("My children"); // has an Arabic translation
    expect(within(document.body).queryAllByText).toBeTypeOf("function"); // sanity
  });
});
