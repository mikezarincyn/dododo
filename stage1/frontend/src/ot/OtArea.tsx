import { useCallback, useEffect, useState } from "react";

import { otApi, getOtToken, setOtToken, clearOtToken, type OtApi, type OtChild, type QueueItem, type Observation, type DomainTrend } from "../api/ot";
import type { TFunc } from "../i18n/strings";
import { OtSignIn } from "./OtSignIn";
import { OtDashboard } from "./OtDashboard";
import { Upload } from "./Upload";
import { Queue } from "./Queue";
import { Annotation } from "./Annotation";
import { ChildProgress, ObservationDetail } from "./ChildProgress";

// OT role container: handles reviewer sign-in, owns live data (care-linked
// children, queue, per-child observations/progress), dispatches to screens. `api`
// is injectable for tests; defaults to the real backend client.
export function OtArea({
  t,
  screen,
  params,
  go,
  toast,
  api = otApi,
}: {
  t: TFunc;
  screen: string;
  params: Record<string, string>;
  go: (screen: string, params?: Record<string, string>) => void;
  toast: (m: string) => void;
  api?: OtApi;
}) {
  const [token, setToken] = useState<string>(getOtToken());
  const [authError, setAuthError] = useState<string | null>(null);
  const [children, setChildren] = useState<OtChild[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [childObs, setChildObs] = useState<{ id: string; observations: Observation[]; progress: Record<string, DomainTrend> }>({ id: "", observations: [], progress: {} });

  const refresh = useCallback(() => {
    api.children().then(setChildren).catch(() => undefined);
    api.queue().then(setQueue).catch(() => undefined);
  }, [api]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  // Load per-child observations + progress when viewing progress/obs.
  const childId = params.childId || "";
  useEffect(() => {
    if (!token || !childId || (screen !== "progress" && screen !== "obs")) return;
    let alive = true;
    Promise.all([api.observations(childId), api.progress(childId)])
      .then(([observations, progress]) => {
        if (alive) setChildObs({ id: childId, observations, progress });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token, childId, screen, api]);

  async function signIn(tok: string) {
    setOtToken(tok);
    setAuthError(null);
    try {
      await api.children(); // validate token
      setToken(tok);
    } catch {
      clearOtToken();
      setAuthError(t("console.signInError"));
    }
  }

  if (!token) {
    return <OtSignIn t={t} onSubmit={signIn} error={authError} />;
  }

  if (screen === "upload") {
    return (
      <Upload
        t={t}
        go={go}
        mode="ot"
        childOptions={children.map((c) => ({ value: c.child_id, label: c.display_code }))}
        upload={(cid, scenario, file) => api.submitVideo(cid, scenario, file).then((r) => { refresh(); return r; })}
        toast={toast}
      />
    );
  }
  if (screen === "queue") {
    return <Queue t={t} go={go} mode="ot" items={queue} />;
  }
  if (screen === "annotate") {
    const item = queue.find((q) => q.submission_id === params.submissionId);
    if (!item) return <Queue t={t} go={go} mode="ot" items={queue} />;
    return <Annotation t={t} go={go} item={item} annotate={(sid, payload) => api.annotate(sid, payload).then((o) => { refresh(); return o; })} toast={toast} />;
  }
  if (screen === "progress") {
    const child = children.find((c) => c.child_id === childId) || { child_id: childId, display_code: "—" };
    const data = childObs.id === childId ? childObs : { observations: [], progress: {} };
    return <ChildProgress t={t} go={go} child={child} progress={data.progress} observations={data.observations} />;
  }
  if (screen === "obs") {
    const child = children.find((c) => c.child_id === childId) || { child_id: childId, display_code: "—" };
    const data = childObs.id === childId ? childObs : { observations: [], progress: {} };
    const obs = data.observations.find((o) => o.id === params.obsId);
    if (!obs) return <ChildProgress t={t} go={go} child={child} progress={data.progress} observations={data.observations} />;
    return <ObservationDetail t={t} go={go} child={child} obs={obs} />;
  }
  return <OtDashboard t={t} go={go} children={children} />;
}
