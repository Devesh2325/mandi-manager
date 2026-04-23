// Mock session — frontend prototype only
const SESSION_KEY = "mandi.session.v1";

export interface Session {
  userId: number;
  username: string;
  name: string;
  role: "admin" | "operator" | "viewer";
  companyId?: number;
  yearId?: number;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s === null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("mandi:session"));
}

export function isLoggedIn() {
  return !!getSession();
}

export function hasContext() {
  const s = getSession();
  return !!(s && s.companyId && s.yearId);
}
