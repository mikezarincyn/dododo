// Admin API client (session cookie). Admin manages people and care-links.

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "parent" | "ot" | "admin";
  status: "active" | "pending" | "deactivated";
  hcpc?: string | null;
  self_registered?: boolean;
  children: number;
}
export interface AdminChild {
  child_id: string;
  display_code: string;
  first_name: string;
  parent_name: string | null;
  parent_email: string | null;
  assigned: { actor_id: string; ot_name?: string }[];
}
export interface Overview {
  parents: number;
  therapists: number;
  pending_ot: number;
  children: number;
  active_care_links: number;
}

const GET: RequestInit = { credentials: "include" };
function postJSON(body: unknown): RequestInit {
  return { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let d = `request failed: ${r.status}`;
    try {
      const b = await r.json();
      if (b?.detail) d = b.detail;
    } catch {
      /* ignore */
    }
    throw new Error(d);
  }
  return (await r.json()) as T;
}

export interface AdminApi {
  overview(): Promise<Overview>;
  therapists(): Promise<AdminUser[]>;
  parents(): Promise<AdminUser[]>;
  children(): Promise<AdminChild[]>;
  createTherapist(email: string, password: string, name: string, hcpc?: string): Promise<void>;
  createParent(email: string, password: string, name: string): Promise<void>;
  setStatus(userId: string, status: "active" | "deactivated"): Promise<void>;
  assignCareLink(childId: string, otId: string): Promise<void>;
  revokeCareLink(childId: string, otId: string): Promise<void>;
}

export const adminApi: AdminApi = {
  async overview() {
    return ok<Overview>(await fetch("/api/admin/overview", GET));
  },
  async therapists() {
    return (await ok<{ therapists: AdminUser[] }>(await fetch("/api/admin/therapists", GET))).therapists;
  },
  async parents() {
    return (await ok<{ parents: AdminUser[] }>(await fetch("/api/admin/parents", GET))).parents;
  },
  async children() {
    return (await ok<{ children: AdminChild[] }>(await fetch("/api/admin/children", GET))).children;
  },
  async createTherapist(email, password, name, hcpc) {
    await ok(await fetch("/api/admin/therapists", postJSON({ email, password, name, hcpc })));
  },
  async createParent(email, password, name) {
    await ok(await fetch("/api/admin/parents", postJSON({ email, password, name })));
  },
  async setStatus(userId, status) {
    await ok(await fetch(`/api/admin/users/${userId}/status`, postJSON({ status })));
  },
  async assignCareLink(childId, otId) {
    await ok(await fetch("/api/admin/care-links", postJSON({ child_id: childId, ot_id: otId })));
  },
  async revokeCareLink(childId, otId) {
    await ok(await fetch("/api/admin/care-links/revoke", postJSON({ child_id: childId, ot_id: otId })));
  },
};
