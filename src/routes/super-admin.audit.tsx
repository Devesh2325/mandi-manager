import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/audit")({
  component: AuditPage,
});

interface Row {
  id: string;
  actor_id: string | null;
  tenant_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

function AuditPage() {
  const navigate = useNavigate();
  const { ready, cloudUser, isSuperAdmin } = useTenant();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!cloudUser) { navigate({ to: "/auth" }); return; }
    if (!isSuperAdmin) { toast.error("Super Admin only."); navigate({ to: "/app" }); return; }
    (async () => {
      const { data, error } = await supabase
        .from("audit_logs").select("*")
        .order("created_at", { ascending: false }).limit(500);
      if (error) toast.error(error.message);
      else setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [ready, cloudUser, isSuperAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold">Audit log</h1>
          <Link to="/super-admin" className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs hover:bg-muted"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Tenant</th><th className="px-3 py-2 text-left">Actor</th><th className="px-3 py-2 text-left">Meta</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No audit events yet.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.tenant_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.actor_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-3 py-2 text-xs"><code>{JSON.stringify(r.meta)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
