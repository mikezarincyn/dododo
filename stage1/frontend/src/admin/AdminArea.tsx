import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Avatar, Badge, Button, Card, Icon, Input, PageHead, Select } from "../components/ds";
import { adminApi, type AdminApi, type AdminChild, type AdminUser, type Overview } from "../api/admin";
import type { TFunc } from "../i18n/strings";

function StatusBadge({ t, status }: { t: TFunc; status: string }) {
  const tone = status === "active" ? "green" : status === "pending" ? "yellow" : "grey";
  return <Badge tone={tone}>{t("admin.status." + status)}</Badge>;
}

// Inline "add a person" form (email + name + password [+ HCPC]).
function CreateForm({ t, withHcpc, submitLabel, nameLabel, onSubmit }: { t: TFunc; withHcpc?: boolean; submitLabel: string; nameLabel: string; onSubmit: (email: string, password: string, name: string, hcpc?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [hcpc, setHcpc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="primary" size="sm" onClick={() => setOpen(true)} iconRight={<Icon name="plus" size={16} color="#fff" />}>
        {submitLabel}
      </Button>
    );
  }
  return (
    <Card padding={24} style={{ marginBottom: 18 }}>
      <div className="col" style={{ gap: 16 }}>
        <Input label={nameLabel} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {withHcpc ? <Input label={t("auth.hcpc")} value={hcpc} onChange={(e) => setHcpc(e.target.value)} /> : null}
        {error ? <p role="alert" style={{ color: "var(--coral-500)", margin: 0, fontSize: 14 }}>{error}</p> : null}
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" size="sm" disabled={!email || !name || !password || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSubmit(email, password, name, hcpc || undefined);
                setOpen(false);
                setEmail(""); setName(""); setPassword(""); setHcpc("");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}>
            {busy ? t("common.loading") : t("admin.save")}
          </Button>
          <button type="button" className="linkish" onClick={() => setOpen(false)}>{t("admin.cancel")}</button>
        </div>
      </div>
    </Card>
  );
}

function PersonCard({ t, u, actions }: { t: TFunc; u: AdminUser; actions: ReactNode }) {
  return (
    <Card padding={18}>
      <div className="row" style={{ alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <Avatar name={u.name} size={40} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)" }}>{u.name}</div>
          <div className="ds-small ds-muted">{u.email}</div>
          <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <StatusBadge t={t} status={u.status} />
            <Badge tone="lilac">{u.children} {t("admin.childCount")}</Badge>
            <span className="ds-small ds-muted">{u.self_registered ? t("admin.source.self") : t("admin.source.admin")}</span>
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 8 }}>{actions}</div>
      </div>
    </Card>
  );
}

export function AdminArea({
  t,
  screen,
  toast,
  api = adminApi,
}: {
  t: TFunc;
  screen: string;
  params: Record<string, string>;
  go: (screen: string, params?: Record<string, string>) => void;
  toast: (m: string) => void;
  api?: AdminApi;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [therapists, setTherapists] = useState<AdminUser[]>([]);
  const [parents, setParents] = useState<AdminUser[]>([]);
  const [children, setChildren] = useState<AdminChild[]>([]);

  const refresh = useCallback(() => {
    if (screen === "overview") api.overview().then(setOverview).catch(() => undefined);
    if (screen === "therapists") api.therapists().then(setTherapists).catch(() => undefined);
    if (screen === "parents") api.parents().then(setParents).catch(() => undefined);
    if (screen === "children") {
      api.children().then(setChildren).catch(() => undefined);
      api.therapists().then(setTherapists).catch(() => undefined); // for the assign picker
    }
  }, [api, screen]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function act(fn: () => Promise<void>, msg?: string) {
    await fn();
    if (msg) toast(msg);
    refresh();
  }

  // ---- overview ----
  if (screen === "overview") {
    const stats = overview
      ? [
          { k: "parents", label: t("admin.stat.parents"), v: overview.parents },
          { k: "therapists", label: t("admin.stat.therapists"), v: overview.therapists },
          { k: "children", label: t("admin.stat.children"), v: overview.children },
          { k: "links", label: t("admin.stat.links"), v: overview.active_care_links },
          { k: "pending", label: t("admin.stat.pending"), v: overview.pending_ot, warn: overview.pending_ot > 0 },
        ]
      : [];
    return (
      <div>
        <PageHead a={t("admin.overview.title.a")} b={t("admin.overview.title.b")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          {stats.map((s) => (
            <Card key={s.k} padding={22} tone={s.warn ? "mint" : "white"}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 34, color: s.warn ? "var(--green-ink)" : "var(--navy-700)", lineHeight: 1 }}>{s.v}</div>
              <div className="ds-small ds-muted" style={{ marginTop: 8 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---- therapists ----
  if (screen === "therapists") {
    return (
      <div style={{ maxWidth: 760 }}>
        <PageHead a={t("admin.therapists.title.a")} b={t("admin.therapists.title.b")} />
        <div style={{ marginBottom: 18 }}>
          <CreateForm t={t} withHcpc submitLabel={t("admin.createTherapist")} nameLabel={t("admin.therapistName")}
            onSubmit={(e, p, n, h) => act(() => api.createTherapist(e, p, n, h))} />
        </div>
        <div className="col" style={{ gap: 12 }}>
          {therapists.length === 0 ? <p className="ds-muted">{t("admin.empty.therapists")}</p> : null}
          {therapists.map((u) => (
            <PersonCard key={u.id} t={t} u={u} actions={
              <>
                {u.status === "pending" ? (
                  <Button variant="primary" size="sm" onClick={() => act(() => api.setStatus(u.id, "active"))}>{t("admin.approve")}</Button>
                ) : u.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={() => act(() => api.setStatus(u.id, "deactivated"))}>{t("admin.deactivate")}</Button>
                ) : (
                  <Button variant="soft" size="sm" onClick={() => act(() => api.setStatus(u.id, "active"))}>{t("admin.reactivate")}</Button>
                )}
              </>
            } />
          ))}
        </div>
      </div>
    );
  }

  // ---- parents ----
  if (screen === "parents") {
    return (
      <div style={{ maxWidth: 760 }}>
        <PageHead a={t("admin.parents.title.a")} b={t("admin.parents.title.b")} />
        <div style={{ marginBottom: 18 }}>
          <CreateForm t={t} submitLabel={t("admin.createParent")} nameLabel={t("admin.parentName")}
            onSubmit={(e, p, n) => act(() => api.createParent(e, p, n))} />
        </div>
        <div className="col" style={{ gap: 12 }}>
          {parents.length === 0 ? <p className="ds-muted">{t("admin.empty.parents")}</p> : null}
          {parents.map((u) => (
            <PersonCard key={u.id} t={t} u={u} actions={
              u.status === "active" ? (
                <Button variant="outline" size="sm" onClick={() => act(() => api.setStatus(u.id, "deactivated"))}>{t("admin.deactivate")}</Button>
              ) : (
                <Button variant="soft" size="sm" onClick={() => act(() => api.setStatus(u.id, "active"))}>{t("admin.reactivate")}</Button>
              )
            } />
          ))}
        </div>
      </div>
    );
  }

  // ---- children & care links (the main screen) ----
  const otOptions = therapists.filter((o) => o.status === "active").map((o) => ({ value: o.id, label: `${o.name} · ${o.email}` }));
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHead a={t("admin.children.title.a")} b={t("admin.children.title.b")} />
      <div className="col" style={{ gap: 12 }}>
        {children.length === 0 ? <p className="ds-muted">{t("admin.empty.children")}</p> : null}
        {children.map((c) => (
          <ChildLinkCard key={c.child_id} t={t} child={c} otOptions={otOptions}
            onAssign={(otId) => act(() => api.assignCareLink(c.child_id, otId))}
            onRevoke={(otId) => act(() => api.revokeCareLink(c.child_id, otId))} />
        ))}
      </div>
    </div>
  );
}

function ChildLinkCard({ t, child, otOptions, onAssign, onRevoke }: {
  t: TFunc;
  child: AdminChild;
  otOptions: { value: string; label: string }[];
  onAssign: (otId: string) => Promise<void>;
  onRevoke: (otId: string) => Promise<void>;
}) {
  const [pick, setPick] = useState("");
  const assigned = child.assigned[0];
  return (
    <Card padding={18}>
      <div className="row" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <span className="code-chip" style={{ fontSize: 14, padding: "6px 10px" }}>{child.display_code}</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--navy-700)" }}>{child.first_name}</div>
          <div className="ds-small ds-muted">{child.parent_name} · {child.parent_email}</div>
        </div>
      </div>
      <hr className="hairline" style={{ margin: "12px 0" }} />
      {assigned ? (
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="chip" style={{ background: "var(--green-100)", color: "var(--green-ink)" }}>
            <Icon name="heart-handshake" size={13} /> {t("admin.assignedTo")} {assigned.ot_name}
          </span>
          <span style={{ flex: 1 }} />
          <Button variant="outline" size="sm" onClick={() => onRevoke(assigned.actor_id)}>{t("admin.revoke")}</Button>
        </div>
      ) : (
        <div className="row" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Select value={pick} placeholder={t("admin.pickTherapist")} options={otOptions} onChange={setPick} />
          </div>
          <Button variant="primary" size="sm" disabled={!pick} onClick={() => onAssign(pick)}>{t("admin.assignDo")}</Button>
        </div>
      )}
    </Card>
  );
}
