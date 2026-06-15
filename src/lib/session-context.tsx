import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { db, seedIfEmpty, type Company, type FinancialYear } from "./db";
import { getSession, setSession, type Session } from "./session";

interface Ctx {
  session: Session | null;
  company: Company | null;
  year: FinancialYear | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  selectContext: (companyId: number, yearId: number) => Promise<void>;
}

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSess] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [year, setYear] = useState<FinancialYear | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const s = getSession();
      setSess(s);
      if (s?.companyId) setCompany((await db.companies.get(s.companyId)) ?? null);
      if (s?.yearId) setYear((await db.financialYears.get(s.yearId)) ?? null);
      setReady(true);
    })();
    const onChange = () => setSess(getSession());
    window.addEventListener("mandi:session", onChange);
    return () => window.removeEventListener("mandi:session", onChange);
  }, []);

  const login = async (username: string, password: string) => {
    const u = await db.users.where("username").equals(username).first();
    if (!u || u.password !== password) return false;
    const s: Session = { userId: u.id!, username: u.username, name: u.name, role: u.role };
    setSession(s);
    setSess(s);
    return true;
  };

  const logout = () => {
    setSession(null);
    setSess(null);
    setCompany(null);
    setYear(null);
    navigate({ to: "/login" });
  };

  const selectContext = async (companyId: number, yearId: number) => {
    const cur = getSession();
    if (!cur) return;
    const next: Session = { ...cur, companyId, yearId };
    setSession(next);
    setSess(next);
    setCompany((await db.companies.get(companyId)) ?? null);
    setYear((await db.financialYears.get(yearId)) ?? null);
    // No auto-seed: workspace stays clean; user configures masters manually.
  };

  return (
    <SessionCtx.Provider value={{ session, company, year, ready, login, logout, selectContext }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useAppSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useAppSession must be used within SessionProvider");
  return ctx;
}

/** Convenience: assert active company+year, throws if missing. */
export function useScope() {
  const { company, year } = useAppSession();
  if (!company || !year) {
    return { companyId: 0, yearId: 0, ready: false } as const;
  }
  return { companyId: company.id!, yearId: year.id!, ready: true } as const;
}
