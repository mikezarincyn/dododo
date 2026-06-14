import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminArea } from "./AdminArea";
import { makeT } from "../i18n/strings";
import type { AdminApi, AdminChild, AdminUser, Overview } from "../api/admin";

const t = makeT("en");
const noop = () => {};

function mkApi(over: Partial<AdminApi> & { _overview?: Overview; _therapists?: AdminUser[]; _children?: AdminChild[] } = {}): AdminApi {
  return {
    overview: vi.fn(async () => over._overview ?? { parents: 0, therapists: 0, pending_ot: 0, children: 0, active_care_links: 0 }),
    therapists: vi.fn(async () => over._therapists ?? []),
    parents: vi.fn(async () => []),
    children: vi.fn(async () => over._children ?? []),
    createTherapist: vi.fn(async () => undefined),
    createParent: vi.fn(async () => undefined),
    setStatus: vi.fn(async () => undefined),
    assignCareLink: vi.fn(async () => undefined),
    revokeCareLink: vi.fn(async () => undefined),
    ...over,
  } as AdminApi;
}

describe("AdminArea", () => {
  it("overview shows the counts incl pending therapist requests", async () => {
    const api = mkApi({ _overview: { parents: 3, therapists: 2, pending_ot: 1, children: 5, active_care_links: 4 } });
    render(<AdminArea t={t} screen="overview" params={{}} go={noop} toast={noop} api={api} />);
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument()); // children
    expect(screen.getByText(t("admin.stat.pending"))).toBeInTheDocument();
  });

  it("create-forms label the name field for the created user, not 'Your name'", async () => {
    const u = userEvent.setup();
    render(<AdminArea t={t} screen="therapists" params={{}} go={noop} toast={noop} api={mkApi()} />);
    await u.click(screen.getByRole("button", { name: t("admin.createTherapist") }));
    expect(screen.getByText(t("admin.therapistName"))).toBeInTheDocument();
    expect(screen.queryByText(t("auth.name"))).toBeNull();

    render(<AdminArea t={t} screen="parents" params={{}} go={noop} toast={noop} api={mkApi()} />);
    await u.click(screen.getByRole("button", { name: t("admin.createParent") }));
    expect(screen.getByText(t("admin.parentName"))).toBeInTheDocument();
  });

  it("approves a pending therapist", async () => {
    const ot: AdminUser = { id: "o1", email: "ot@x.com", name: "Maya", role: "ot", status: "pending", children: 0 };
    const api = mkApi({ _therapists: [ot] });
    render(<AdminArea t={t} screen="therapists" params={{}} go={noop} toast={noop} api={api} />);
    await waitFor(() => expect(screen.getByText("Maya")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: t("admin.approve") }));
    expect(api.setStatus).toHaveBeenCalledWith("o1", "active");
  });

  it("assigns a therapist to an unassigned child via the picker", async () => {
    const u = userEvent.setup();
    const child: AdminChild = { child_id: "c1", display_code: "CH-AAAAAA", first_name: "Mia", parent_name: "Pat", parent_email: "p@x.com", assigned: [] };
    const ot: AdminUser = { id: "o1", email: "ot@x.com", name: "Maya", role: "ot", status: "active", children: 0 };
    const api = mkApi({ _children: [child], _therapists: [ot] });
    render(<AdminArea t={t} screen="children" params={{}} go={noop} toast={noop} api={api} />);
    await waitFor(() => expect(screen.getByText("CH-AAAAAA")).toBeInTheDocument());
    await u.selectOptions(screen.getByRole("combobox"), "o1");
    await u.click(screen.getByRole("button", { name: t("admin.assignDo") }));
    expect(api.assignCareLink).toHaveBeenCalledWith("c1", "o1");
  });

  it("revokes the care link for an assigned child", async () => {
    const u = userEvent.setup();
    const child: AdminChild = { child_id: "c1", display_code: "CH-AAAAAA", first_name: "Mia", parent_name: "Pat", parent_email: "p@x.com", assigned: [{ actor_id: "o1", ot_name: "Maya" }] };
    const api = mkApi({ _children: [child], _therapists: [] });
    render(<AdminArea t={t} screen="children" params={{}} go={noop} toast={noop} api={api} />);
    await waitFor(() => expect(screen.getByText("CH-AAAAAA")).toBeInTheDocument());
    await u.click(screen.getByRole("button", { name: t("admin.revoke") }));
    expect(api.revokeCareLink).toHaveBeenCalledWith("c1", "o1");
  });
});
