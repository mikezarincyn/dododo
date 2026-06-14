// Parent API client. Talks to the stage1 backend parent endpoints. Identity is a
// client-held opaque id (uuid4 hex) in the X-Parent-Id header — pilot-grade
// isolation until real parent auth exists (see backend require_parent TODO).

export interface ParentChild {
  child_id: string;
  display_code: string;
  first_name: string;
  birth_month: string;
  care_link: { ot_name?: string; status?: string } | null;
  created_at?: string;
}

export interface Invite {
  contact: string;
  status: "sent" | "accepted";
  created_at?: string;
}

export interface ParentSubmission {
  submission_id: string;
  display_code: string;
  scenario: string | null;
  size_bytes: number | null;
  state: string;
  video_purged: boolean;
  // SAFE for the parent: coarse RECORDING quality (about the camera/framing, not the
  // child). No metric/signal/score/judgment is ever exposed to the parent.
  recording_quality: "good" | "partial" | "low" | null;
  created_at: string;
}

export interface ParentApi {
  listChildren(): Promise<ParentChild[]>;
  createChild(firstName: string, birthMonth: string, checkedIds: string[]): Promise<{ child_id: string; display_code: string }>;
  listInvites(): Promise<Invite[]>;
  sendInvite(contact: string): Promise<Invite>;
  submitVideo(childId: string, scenario: string, file: File): Promise<{ submission_id: string }>;
  listSubmissions(): Promise<ParentSubmission[]>;
  childObservations(childId: string): Promise<{ id: string; created_at: string }[]>;
}

// Identity is the HTTP-only session cookie (parent account). credentials:"include"
// sends it; the backend scopes every call to the signed-in parent.
const GET: RequestInit = { credentials: "include" };
function postJSON(body: unknown): RequestInit {
  return { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`request failed: ${r.status}`);
  return (await r.json()) as T;
}

// Real implementation against the live backend.
export const parentApi: ParentApi = {
  async listChildren() {
    return (await ok<{ children: ParentChild[] }>(await fetch("/api/parent/children", GET))).children;
  },
  async createChild(firstName, birthMonth, checkedIds) {
    return ok<{ child_id: string; display_code: string }>(
      await fetch("/api/parent/children", postJSON({ first_name: firstName, birth_month: birthMonth, checked_ids: checkedIds })),
    );
  },
  async listInvites() {
    return (await ok<{ invites: Invite[] }>(await fetch("/api/parent/invites", GET))).invites;
  },
  async sendInvite(contact) {
    return ok<Invite>(await fetch("/api/parent/invites", postJSON({ contact })));
  },
  async submitVideo(childId, scenario, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("child_id", childId);
    fd.append("scenario", scenario);
    const r = await fetch("/api/submissions", { method: "POST", credentials: "include", body: fd });
    return ok<{ submission_id: string }>(r);
  },
  async listSubmissions() {
    return (await ok<{ submissions: ParentSubmission[] }>(await fetch("/api/parent/submissions", GET))).submissions;
  },
  async childObservations(childId) {
    // Confirmed-only (enforced server-side). Parent gentle view uses only the
    // COUNT/dates — never the clinical summaries, metrics or scores.
    return (await ok<{ observations: { id: string; created_at: string }[] }>(await fetch(`/api/parent/child/${childId}/observations`, GET))).observations;
  },
};
