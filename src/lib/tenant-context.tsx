/**
 * Tenant + Cloud-Auth context for the multi-tenant SaaS layer.
 *
 * This is ADDITIVE: it does not replace the existing local IndexedDB
 * session (see session-context.tsx). It provides:
 *   - cloud-authenticated user (Supabase auth)
 *   - the user's tenants and currently active tenant
 *   - role per active tenant
 *   - super-admin impersonation (pick any tenant to "act as")
 *
 * Existing screens keep using IndexedDB — they don't have to know
 * about this layer until Phase 3 sync wires them to the cloud.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type TenantRole =
  | "super_admin"
  | "tenant_admin"
  | "operator"
  | "accountant"
  | "viewer";

export interface CloudTenant {
  id: string;
  company_name: string;
  gst_number: string | null;
  license_number: string | null;
  address: string | null;
  status: "active" | "inactive";
  owner_user_id: string | null;
  created_at: string;
}

export interface RoleRow {
  id: string;
  tenant_id: string | null;
  role: TenantRole;
}

interface TenantCtx {
  ready: boolean;
  cloudUser: User | null;
  cloudSession: Session | null;
  isSuperAdmin: boolean;
  /** Tenants the user belongs to (full list when super admin). */
  myTenants: CloudTenant[];
  /** Currently selected tenant (null until chosen / for super admin browsing). */
  activeTenant: CloudTenant | null;
  /** Role within the active tenant. super_admin always wins. */
  activeRole: TenantRole | null;
  /** True when super admin is impersonating a specific tenant. */
  impersonating: boolean;
  setActiveTenant: (id: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<TenantCtx | null>(null);

const ACTIVE_TENANT_KEY = "mandi.activeTenantId.v1";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSession, setCloudSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [myTenants, setMyTenants] = useState<CloudTenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isSuperAdmin = useMemo(
    () => roles.some((r) => r.role === "super_admin"),
    [roles],
  );

  // Initial auth bootstrap. IMPORTANT: subscribe BEFORE getSession (Lovable rule).
  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (cancelled) return;
      setCloudSession(session);
      setCloudUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setCloudSession(data.session);
      setCloudUser(data.session?.user ?? null);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Whenever the cloud user changes, reload roles + tenants.
  useEffect(() => {
    if (!cloudUser) {
      setRoles([]);
      setMyTenants([]);
      setActiveTenantId(null);
      return;
    }
    loadRolesAndTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUser?.id]);

  const loadRolesAndTenants = async () => {
    if (!cloudUser) return;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id, tenant_id, role")
      .eq("user_id", cloudUser.id);

    const safeRoles = (roleRows ?? []) as RoleRow[];
    setRoles(safeRoles);

    const isSuper = safeRoles.some((r) => r.role === "super_admin");

    // Tenants the user belongs to. RLS will already scope this; super admin sees all.
    const tenantQuery = supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: tenantRows } = await tenantQuery;
    setMyTenants((tenantRows ?? []) as CloudTenant[]);

    // Pick active tenant: stored choice -> profile default -> first tenant.
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(ACTIVE_TENANT_KEY)
        : null;
    let chosen: string | null = null;
    if (stored && (tenantRows ?? []).some((t) => t.id === stored)) {
      chosen = stored;
    } else if (!isSuper) {
      const firstMember = safeRoles.find((r) => r.tenant_id);
      chosen = firstMember?.tenant_id ?? null;
      if (!chosen && (tenantRows ?? []).length > 0) {
        chosen = tenantRows![0].id;
      }
    }
    setActiveTenantId(chosen);
  };

  const activeTenant = useMemo(
    () => myTenants.find((t) => t.id === activeTenantId) ?? null,
    [myTenants, activeTenantId],
  );

  const activeRole = useMemo<TenantRole | null>(() => {
    if (isSuperAdmin) return "super_admin";
    if (!activeTenantId) return null;
    const r = roles.find((x) => x.tenant_id === activeTenantId);
    return r?.role ?? null;
  }, [roles, activeTenantId, isSuperAdmin]);

  const impersonating = isSuperAdmin && !!activeTenantId;

  const setActiveTenant = async (id: string | null) => {
    setActiveTenantId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_TENANT_KEY, id);
      else localStorage.removeItem(ACTIVE_TENANT_KEY);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
    }
    setActiveTenantId(null);
  };

  const value: TenantCtx = {
    ready,
    cloudUser,
    cloudSession,
    isSuperAdmin,
    myTenants,
    activeTenant,
    activeRole,
    impersonating,
    setActiveTenant,
    refresh: loadRolesAndTenants,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenant must be used inside <TenantProvider>");
  return v;
}

/** Permission helper for cloud-tenant role. Mirrors the local `can()` matrix. */
export function tenantCan(
  role: TenantRole | null,
  perm:
    | "manage_tenant"
    | "manage_users"
    | "manage_data"
    | "view_data"
    | "super",
): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  switch (perm) {
    case "super":
      return false;
    case "manage_tenant":
      return role === "tenant_admin";
    case "manage_users":
      return role === "tenant_admin";
    case "manage_data":
      return role === "tenant_admin" || role === "operator" || role === "accountant";
    case "view_data":
      return true; // any tenant member
  }
}
