import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthScreen } from "./AuthScreen";
import { makeT } from "../i18n/strings";
import type { AuthApi, AuthUser } from "../api/auth";

const t = makeT("en");
const user: AuthUser = { id: "p1", email: "a@b.com", role: "parent", status: "active", name: "A" };

function api(login: AuthApi["login"]): AuthApi {
  return { me: vi.fn(async () => null), login, register: vi.fn(), logout: vi.fn() } as unknown as AuthApi;
}

describe("AuthScreen (login)", () => {
  it("signs in and reports the user up", async () => {
    const u = userEvent.setup();
    const login = vi.fn(async () => user);
    const onAuthed = vi.fn();
    render(<AuthScreen lang="en" setLang={() => {}} onAuthed={onAuthed} api={api(login)} />);
    await u.type(screen.getByLabelText(t("auth.email")), "a@b.com");
    await u.type(screen.getByLabelText(t("auth.password")), "password123");
    await u.click(screen.getByRole("button", { name: t("auth.signIn") }));
    expect(login).toHaveBeenCalledWith("a@b.com", "password123");
    await waitFor(() => expect(onAuthed).toHaveBeenCalledWith(user));
  });

  it("shows an error on invalid credentials", async () => {
    const u = userEvent.setup();
    const login = vi.fn(async () => {
      const e = new Error("invalid email or password") as Error & { status?: number };
      e.status = 401;
      throw e;
    });
    render(<AuthScreen lang="en" setLang={() => {}} onAuthed={vi.fn()} api={api(login)} />);
    await u.type(screen.getByLabelText(t("auth.email")), "a@b.com");
    await u.type(screen.getByLabelText(t("auth.password")), "wrongpass");
    await u.click(screen.getByRole("button", { name: t("auth.signIn") }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(t("auth.error.invalid")));
  });
});
