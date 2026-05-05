import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Building2, Users, FileText, Power, LogIn, Plus, ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminPage,
});

interface Stats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_challans: number;
  total_teeps: number;
  total_vouchers: number;
}
interface TenantStat {
  tenant_id: string;
  company_name: string;
  status: string;
  user_count: number;
  challan_count: number;
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const { ready, cloudUser, isSuperAdmin, setActiveTenant, refresh } = useTenant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<TenantStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGst, setNewGst] = useState("");
  const [newLicense, setNewLicense] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!cloudUser) {
      navigate({ to: "/auth" });
      return;
    }
    if (!isSuperAdmin) {
      toast.error("Super Admin access required.");
      navigate({ to: "/app" });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cloudUser, isSuperAdmin]);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.rpc("super_admin_stats"),
      supabase.rpc("super_admin_tenant_stats"),
    ]);
    setStats((s as unknown as Stats[])?.[0] ?? null);
    setRows((r as unknown as TenantStat[]) ?? []);
    setLoading(false);
  };

  const toggleStatus = async (t: TenantStat) => {
    const next = t.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("tenants")
      .update({ status: next })
      .eq("id", t.tenant_id);
    if (error) toast.error(error.message);
    else {
      await logAudit("tenant.status_changed", { tenant_id: t.tenant_id, target_type: "tenant", target_id: t.tenant_id, meta: { status: next } });
      toast.success(`Tenant ${next === "active" ? "activated" : "deactivated"}.`);
      load();
    }
  };

  const deleteTenant = async (t: TenantStat) => {
    if (!confirm(`Delete tenant "${t.company_name}"? This is irreversible.`)) return;
    const { error } = await supabase.from("tenants").delete().eq("id", t.tenant_id);
    if (error) { toast.error(error.message); return; }
    await logAudit("tenant.deleted", { target_type: "tenant", target_id: t.tenant_id, meta: { name: t.company_name } });
    toast.success("Tenant deleted.");
    load();
  };

  const impersonate = async (t: TenantStat) => {
    await setActiveTenant(t.tenant_id);
    await logAudit("impersonation.start", { tenant_id: t.tenant_id, target_type: "tenant", target_id: t.tenant_id });
    toast.success(`Impersonating ${t.company_name}`);
    navigate({ to: "/app" });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("tenants").insert({
      company_name: newName,
      gst_number: newGst || null,
      license_number: newLicense || null,
      owner_user_id: cloudUser!.id,
      status: "active",
    }).select().single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    await logAudit("tenant.created", { tenant_id: data?.id, target_type: "tenant", target_id: data?.id, meta: { name: newName } });
    toast.success("Tenant created.");
    setNewName(""); setNewGst(""); setNewLicense("");
    await refresh();
    await load();
  };

  if (!ready || loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading super-admin dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Super Admin</div>
            <h1 className="text-xl font-semibold">Tenant Control Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/super-admin/leads" className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs hover:bg-muted">
              <FileText className="h-3.5 w-3.5" /> Sales enquiries
            </Link>
            <Link to="/super-admin/audit" className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs hover:bg-muted">
              <FileText className="h-3.5 w-3.5" /> Audit log
            </Link>
            <Link to="/app" className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs hover:bg-muted">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat icon={<Building2 />} label="Tenants" value={stats?.total_tenants ?? 0} />
          <Stat icon={<Power />} label="Active" value={stats?.active_tenants ?? 0} />
          <Stat icon={<Users />} label="Users" value={stats?.total_users ?? 0} />
          <Stat icon={<FileText />} label="Challans" value={stats?.total_challans ?? 0} />
          <Stat icon={<FileText />} label="Teeps" value={stats?.total_teeps ?? 0} />
          <Stat icon={<FileText />} label="Vouchers" value={stats?.total_vouchers ?? 0} />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create new tenant</h2>
          <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="Company name *" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <input className="rounded border px-3 py-2 text-sm" placeholder="GSTIN" value={newGst} onChange={(e) => setNewGst(e.target.value)} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="APMC License" value={newLicense} onChange={(e) => setNewLicense(e.target.value)} />
            <button disabled={creating} className="md:col-span-4 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {creating ? "Creating…" : "Create tenant"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3 text-sm font-semibold">All tenants</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left">Company</th>
                <th className="px-5 py-2 text-right">Users</th>
                <th className="px-5 py-2 text-right">Challans</th>
                <th className="px-5 py-2 text-left">Status</th>
                <th className="px-5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (<tr><td className="px-5 py-6 text-muted-foreground" colSpan={5}>No tenants yet.</td></tr>)}
              {rows.map((t) => (
                <tr key={t.tenant_id} className="border-t">
                  <td className="px-5 py-3 font-medium">{t.company_name}</td>
                  <td className="px-5 py-3 text-right">{t.user_count}</td>
                  <td className="px-5 py-3 text-right">{t.challan_count}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => impersonate(t)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"><LogIn className="h-3 w-3" /> Impersonate</button>
                      <button onClick={() => toggleStatus(t)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"><Power className="h-3 w-3" />{t.status === "active" ? "Deactivate" : "Activate"}</button>
                      <button onClick={() => deleteTenant(t)} className="inline-flex items-center gap-1 rounded border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>{label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
