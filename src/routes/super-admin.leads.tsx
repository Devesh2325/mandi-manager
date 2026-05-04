import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MessageSquare, Trash2 } from "lucide-react";

export const Route = createFileRoute("/super-admin/leads")({
  component: LeadsPage,
});

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  city: string | null;
  message: string | null;
  status: string;
  sales_notes: string | null;
  follow_up_at: string | null;
  source: string | null;
  created_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;

function LeadsPage() {
  const navigate = useNavigate();
  const { ready, cloudUser, isSuperAdmin } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!ready) return;
    if (!cloudUser) return navigate({ to: "/auth" });
    if (!isSuperAdmin) {
      toast.error("Super Admin access required.");
      return navigate({ to: "/app" });
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cloudUser, isSuperAdmin]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setLeads((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      toast.success("Updated.");
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setLeads((r) => r.filter((l) => l.id !== id));
  };

  const visible = filter === "all" ? leads : leads.filter((l) => l.status === filter);
  const counts = STATUSES.map((s) => ({ s, n: leads.filter((l) => l.status === s).length }));

  if (!ready || loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading leads…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Super Admin
            </div>
            <h1 className="text-xl font-semibold">Sales Enquiries</h1>
          </div>
          <Link
            to="/super-admin"
            className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap gap-2">
          <FilterChip label={`All (${leads.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
          {counts.map((c) => (
            <FilterChip
              key={c.s}
              label={`${c.s} (${c.n})`}
              active={filter === c.s}
              onClick={() => setFilter(c.s)}
            />
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
            No enquiries{filter !== "all" ? ` in "${filter}"` : ""} yet.
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onUpdate={(patch) => updateLead(lead.id, patch)}
                onDelete={() => deleteLead(lead.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs capitalize ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function LeadCard({
  lead,
  onUpdate,
  onDelete,
}: {
  lead: Lead;
  onUpdate: (patch: Partial<Lead>) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(lead.sales_notes ?? "");
  const [followUp, setFollowUp] = useState(lead.follow_up_at?.slice(0, 16) ?? "");
  const created = new Date(lead.created_at).toLocaleString();

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{lead.name}</h3>
            <StatusPill status={lead.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3.5 w-3.5" /> {lead.phone}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" /> {lead.email}
              </a>
            )}
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {[lead.company, lead.city].filter(Boolean).join(" · ")} · {created}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lead.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="rounded border bg-background px-2 py-1 text-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {lead.message && (
        <div className="mt-3 rounded bg-muted/50 p-3 text-sm">{lead.message}</div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (lead.sales_notes ?? "") && onUpdate({ sales_notes: notes })}
          rows={2}
          placeholder="Sales notes — what did the customer say?"
          className="rounded border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground">Follow-up</label>
          <input
            type="datetime-local"
            value={followUp}
            onChange={(e) => {
              setFollowUp(e.target.value);
              onUpdate({ follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null });
            }}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-700",
    contacted: "bg-amber-500/15 text-amber-700",
    qualified: "bg-purple-500/15 text-purple-700",
    converted: "bg-emerald-500/15 text-emerald-700",
    lost: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
