import { useCallback, useEffect, useState } from "react";

import type { TFunc } from "../i18n/strings";
import { parentApi, type ParentApi, type ParentChild, type Invite, type ParentSubmission } from "../api/parent";
import { ParentChildren } from "./ParentChildren";
import { ParentAddChild } from "./ParentAddChild";
import { ParentInvite } from "./ParentInvite";
import { ParentProgress } from "./ParentProgress";
import { Upload } from "../ot/Upload";
import { Queue } from "../ot/Queue";

// Parent role container: owns the parent's live data (own children, invites,
// upload queue, all scoped server-side by X-Parent-Id). `api` injectable for tests.
export function ParentArea({
  t,
  screen,
  params,
  go,
  toast,
  api = parentApi,
}: {
  t: TFunc;
  screen: string;
  params: Record<string, string>;
  go: (screen: string, params?: Record<string, string>) => void;
  toast: (m: string) => void;
  api?: ParentApi;
}) {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submissions, setSubmissions] = useState<ParentSubmission[]>([]);
  const [reviewed, setReviewed] = useState<{ childId: string; count: number }>({ childId: "", count: 0 });

  const refreshChildren = useCallback(() => {
    api.listChildren().then(setChildren).catch(() => undefined);
  }, [api]);
  const refreshInvites = useCallback(() => {
    api.listInvites().then(setInvites).catch(() => undefined);
  }, [api]);
  const refreshSubmissions = useCallback(() => {
    api.listSubmissions().then(setSubmissions).catch(() => undefined);
  }, [api]);

  useEffect(() => {
    refreshChildren();
    refreshInvites();
    refreshSubmissions();
  }, [refreshChildren, refreshInvites, refreshSubmissions]);

  // How many videos the therapist has reviewed for this child (confirmed-only,
  // count only — no clinical detail reaches the parent gentle view).
  const progressChildId = screen === "progress" ? params.childId : "";
  useEffect(() => {
    if (!progressChildId) return;
    let alive = true;
    api.childObservations(progressChildId)
      .then((obs) => alive && setReviewed({ childId: progressChildId, count: obs.length }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [progressChildId, api]);

  const sendInvite = useCallback(
    async (contact: string) => {
      await api.sendInvite(contact);
      toast(t("status.sent"));
      refreshInvites();
    },
    [api, toast, t, refreshInvites],
  );

  if (screen === "addchild") {
    return <ParentAddChild t={t} go={go} createChild={api.createChild} onAdded={refreshChildren} />;
  }
  if (screen === "invite") {
    return <ParentInvite t={t} invites={invites} sendInvite={sendInvite} />;
  }
  if (screen === "progress") {
    const count = reviewed.childId === params.childId ? reviewed.count : 0;
    return <ParentProgress t={t} go={go} child={children.find((c) => c.child_id === params.childId)} reviewedCount={count} />;
  }
  if (screen === "upload") {
    return (
      <Upload
        t={t}
        go={go}
        mode="parent"
        childOptions={children.map((c) => ({ value: c.child_id, label: `${c.first_name} · ${c.display_code}` }))}
        toast={toast}
        onUploaded={refreshSubmissions}
      />
    );
  }
  if (screen === "queue") {
    return <Queue t={t} go={go} mode="parent" items={submissions} />;
  }
  return <ParentChildren t={t} go={go} children={children} />;
}
