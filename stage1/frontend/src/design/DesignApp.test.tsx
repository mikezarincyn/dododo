import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import DesignApp from "./DesignApp";
import { makeT, isRTL } from "../i18n/strings";
import type { AuthApi, AuthUser } from "../api/auth";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dir = "ltr";
});
afterEach(() => localStorage.clear());

function apiWith(user: AuthUser | null): AuthApi {
  return {
    me: vi.fn(async () => user),
    login: vi.fn(async () => user as AuthUser),
    register: vi.fn(async () => ({ user: user as AuthUser, pending: false })),
    logout: vi.fn(async () => undefined),
    requestReset: vi.fn(async () => ({})),
    resetPassword: vi.fn(async () => undefined),
  };
}

const parent: AuthUser = { id: "p1", email: "mum@example.com", role: "parent", status: "active", name: "Mum" };

describe("DesignApp auth gate", () => {
  it("shows the sign-in screen when not authenticated", async () => {
    render(<DesignApp api={apiWith(null)} />);
    await waitFor(() => expect(screen.getByText(makeT("en")("auth.email"))).toBeInTheDocument());
    expect(screen.getByRole("button", { name: makeT("en")("auth.signIn") })).toBeInTheDocument();
    // no role switcher anymore
    expect(screen.queryByText("Occupational therapist")).toBeNull();
  });

  it("routes a signed-in parent straight to their area (with Log out)", async () => {
    render(<DesignApp api={apiWith(parent)} />);
    await waitFor(() => expect(screen.getAllByText("My children").length).toBeGreaterThanOrEqual(1));
    expect(screen.getByRole("button", { name: makeT("en")("auth.logout") })).toBeInTheDocument();
  });

  it("greets the parent with their account name, not a demo name", async () => {
    render(<DesignApp api={apiWith(parent)} />);
    await waitFor(() => expect(screen.getByText("Mum")).toBeInTheDocument());
    expect(screen.queryByText("Anna")).toBeNull();
  });
});

describe("i18n + RTL", () => {
  it("falls back locale → en → humanized (structured) / passthrough (content)", () => {
    const t = makeT("de");
    expect(t("nav.children")).toBe("Meine Kinder");
    expect(t("This phrase is absent from every dictionary")).toBe("This phrase is absent from every dictionary");
    expect(t("totally.unknown.key")).toBe("Key");
  });

  it("marks Arabic as RTL and others LTR", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("en")).toBe(false);
    expect(isRTL("ko")).toBe(false);
  });
});
