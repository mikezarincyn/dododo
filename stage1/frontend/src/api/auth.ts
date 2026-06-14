// Auth client — email/password with an HTTP-only session cookie. All calls use
// credentials:"include" so the cookie rides along; no tokens in JS.

export type Role = "parent" | "ot" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: "active" | "pending" | "deactivated";
  name: string;
  hcpc?: string | null;
  self_registered?: boolean;
}

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail = `request failed: ${r.status}`;
    try {
      const b = await r.json();
      if (b && b.detail) detail = b.detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = r.status;
    throw err;
  }
  return (await r.json()) as T;
}

export interface AuthApi {
  me(): Promise<AuthUser | null>;
  login(email: string, password: string): Promise<AuthUser>;
  register(input: { email: string; password: string; name: string; role: "parent" | "ot"; hcpc?: string }): Promise<{ user: AuthUser; pending: boolean }>;
  logout(): Promise<void>;
}

export const authApi: AuthApi = {
  async me() {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (r.status === 401) return null;
    return (await jsonOrThrow<{ user: AuthUser }>(r)).user;
  },
  async login(email, password) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return (await jsonOrThrow<{ user: AuthUser }>(r)).user;
  },
  async register(input) {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return jsonOrThrow<{ user: AuthUser; pending: boolean }>(r);
  },
  async logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  },
};
