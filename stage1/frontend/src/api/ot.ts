// OT API client. Identity = reviewer access token (Bearer), stored locally after
// sign-in. All OT data is scoped server-side to the OT's active care links.

export interface DomainTrend {
  trend: "improving" | "steady" | "declining";
  filled: number;
  spark: number[];
}
export interface OtChild {
  child_id: string;
  display_code: string;
  last_video: string | null;
  last_obs: string | null;
  domains: Record<string, DomainTrend>;
}
export interface QueueItem {
  submission_id: string;
  display_code: string;
  scenario: string | null;
  size_bytes: number | null;
  state: string;
  created_at: string;
}
export interface Metric {
  label: string;
  value: string;
  state: "confirmed" | "calibration";
  score?: number;
  domains?: string[];
}
export interface Observation {
  id: string;
  child_id: string;
  display_code: string;
  scenario: string;
  domains: string[];
  duration: string;
  summary: string;
  notes: string;
  metrics: Metric[];
  domain_scores: Record<string, number>;
  created_at: string;
}
export interface AnnotatePayload {
  scenario: string;
  domains: string[];
  duration: string;
  summary: string;
  notes: string;
  metrics: Metric[];
}

// Identity is the HTTP-only session cookie (set at login). credentials:"include"
// sends it; no tokens in JS.
const GET: RequestInit = { credentials: "include" };
function postJSON(body: unknown): RequestInit {
  return { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`request failed: ${r.status}`);
  return (await r.json()) as T;
}

export interface OtApi {
  children(): Promise<OtChild[]>;
  queue(): Promise<QueueItem[]>;
  observations(childId: string): Promise<Observation[]>;
  progress(childId: string): Promise<Record<string, DomainTrend>>;
  annotate(submissionId: string, payload: AnnotatePayload): Promise<Observation>;
  submitVideo(childId: string, scenario: string, file: File): Promise<{ submission_id: string }>;
}

export const otApi: OtApi = {
  async children() {
    return (await ok<{ children: OtChild[] }>(await fetch("/api/ot/children", GET))).children;
  },
  async queue() {
    return (await ok<{ items: QueueItem[] }>(await fetch("/api/ot/queue", GET))).items;
  },
  async observations(childId) {
    return (await ok<{ observations: Observation[] }>(await fetch(`/api/ot/child/${childId}/observations`, GET))).observations;
  },
  async progress(childId) {
    return (await ok<{ progress: Record<string, DomainTrend> }>(await fetch(`/api/ot/child/${childId}/progress`, GET))).progress;
  },
  async annotate(submissionId, payload) {
    return ok<Observation>(await fetch(`/api/ot/annotate/${submissionId}`, postJSON(payload)));
  },
  async submitVideo(childId, scenario, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("child_id", childId);
    fd.append("scenario", scenario);
    const r = await fetch("/api/submissions", { method: "POST", credentials: "include", body: fd });
    return ok<{ submission_id: string }>(r);
  },
};
