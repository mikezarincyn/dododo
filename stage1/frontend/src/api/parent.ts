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

function parentId(): string {
  let id = localStorage.getItem("dododoParentId");
  if (!id) {
    const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    id = uuid.replace(/[^0-9a-f]/gi, "").slice(0, 32).padEnd(32, "0").toLowerCase();
    localStorage.setItem("dododoParentId", id);
  }
  return id;
}

function headers(): Record<string, string> {
  return { "X-Parent-Id": parentId(), "Content-Type": "application/json" };
}

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`request failed: ${r.status}`);
  return (await r.json()) as T;
}

// Real implementation against the live backend.
export const parentApi: ParentApi = {
  async listChildren() {
    const r = await fetch("/api/parent/children", { headers: headers() });
    return (await ok<{ children: ParentChild[] }>(r)).children;
  },
  async createChild(firstName, birthMonth, checkedIds) {
    const r = await fetch("/api/parent/children", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ first_name: firstName, birth_month: birthMonth, checked_ids: checkedIds }),
    });
    return ok<{ child_id: string; display_code: string }>(r);
  },
  async listInvites() {
    const r = await fetch("/api/parent/invites", { headers: headers() });
    return (await ok<{ invites: Invite[] }>(r)).invites;
  },
  async sendInvite(contact) {
    const r = await fetch("/api/parent/invites", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ contact }),
    });
    return ok<Invite>(r);
  },
  async submitVideo(childId, scenario, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("child_id", childId);
    fd.append("scenario", scenario);
    const r = await fetch("/api/submissions", { method: "POST", body: fd });
    return ok<{ submission_id: string }>(r);
  },
  async listSubmissions() {
    const r = await fetch("/api/parent/submissions", { headers: headers() });
    return (await ok<{ submissions: ParentSubmission[] }>(r)).submissions;
  },
  async childObservations(childId) {
    // Confirmed-only (enforced server-side). Parent gentle view uses only the
    // COUNT/dates — never the clinical summaries, metrics or scores.
    const r = await fetch(`/api/parent/child/${childId}/observations`, { headers: headers() });
    return (await ok<{ observations: { id: string; created_at: string }[] }>(r)).observations;
  },
};
