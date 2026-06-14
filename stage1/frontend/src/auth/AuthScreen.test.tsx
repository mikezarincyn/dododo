import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthScreen } from "./AuthScreen";
import { makeT } from "../i18n/strings";
import type { AuthApi, AuthUser } from "../api/auth";

const t = makeT("en");
const user: AuthUser = { id: "p1", email: "a@b.com", role: "parent", status: "active", name: "A" };

function api(login: AuthApi["login"]): AuthApi {
  return { me: vi.fn(async () => null), login, register: vi.fn(), logout: vi.fn(), requestReset: vi.fn(), resetPassword: vi.fn() } as unknown as AuthApi;
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

  it("parent self-registration signs the parent in", async () => {
    const u = userEvent.setup();
    const register = vi.fn(async () => ({ user, pending: false }));
    const onAuthed = vi.fn();
    const a = { me: vi.fn(async () => null), login: vi.fn(), register, logout: vi.fn() } as unknown as AuthApi;
    render(<AuthScreen lang="en" setLang={() => {}} onAuthed={onAuthed} api={a} />);
    await u.click(screen.getByRole("button", { name: t("auth.createAccount") }));
    await u.type(screen.getByLabelText(t("auth.name")), "Mum");
    await u.type(screen.getByLabelText(t("auth.email")), "mum@x.com");
    await u.type(screen.getByLabelText(t("auth.password")), "password123");
    await u.click(screen.getByRole("button", { name: t("auth.register.submitParent") }));
    expect(register).toHaveBeenCalledWith({ email: "mum@x.com", password: "password123", name: "Mum", role: "parent", hcpc: undefined });
    await waitFor(() => expect(onAuthed).toHaveBeenCalledWith(user));
  });

  it("therapist request shows the pending message and does not sign in", async () => {
    const u = userEvent.setup();
    const register = vi.fn(async () => ({ user, pending: true }));
    const onAuthed = vi.fn();
    const a = { me: vi.fn(async () => null), login: vi.fn(), register, logout: vi.fn() } as unknown as AuthApi;
    render(<AuthScreen lang="en" setLang={() => {}} onAuthed={onAuthed} api={a} />);
    await u.click(screen.getByRole("button", { name: t("auth.createAccount") }));
    await u.click(screen.getByText(t("auth.register.iAmOt")));
    await u.type(screen.getByLabelText(t("auth.name")), "Maya");
    await u.type(screen.getByLabelText(t("auth.email")), "maya@clinic.org");
    await u.type(screen.getByLabelText(t("auth.password")), "password123");
    await u.click(screen.getByRole("button", { name: t("auth.register.submitOt") }));
    await waitFor(() => expect(screen.getByText(t("auth.register.otPending"))).toBeInTheDocument());
    expect(onAuthed).not.toHaveBeenCalled();
  });

  it("forgot-password flow surfaces the reset form and sets a new password", async () => {
    const u = userEvent.setup();
    const requestReset = vi.fn(async () => ({ token: "tok123", reset_path: "/?reset_token=tok123" }));
    const resetPassword = vi.fn(async () => undefined);
    const a = { me: vi.fn(async () => null), login: vi.fn(), register: vi.fn(), logout: vi.fn(), requestReset, resetPassword } as unknown as AuthApi;
    render(<AuthScreen lang="en" setLang={() => {}} onAuthed={vi.fn()} api={a} />);
    await u.click(screen.getByRole("button", { name: t("auth.forgot") }));
    await u.type(screen.getByLabelText(t("auth.email")), "p@x.com");
    await u.click(screen.getByRole("button", { name: t("auth.forgot.submit") }));
    expect(requestReset).toHaveBeenCalledWith("p@x.com");
    // now in reset mode (demo surfaces the link in-app)
    await waitFor(() => expect(screen.getByLabelText(t("auth.reset.newPassword"))).toBeInTheDocument());
    await u.type(screen.getByLabelText(t("auth.reset.newPassword")), "newpassword2");
    await u.click(screen.getByRole("button", { name: t("auth.reset.submit") }));
    expect(resetPassword).toHaveBeenCalledWith("tok123", "newpassword2");
    await waitFor(() => expect(screen.getByText(t("auth.reset.done"))).toBeInTheDocument());
  });
});
