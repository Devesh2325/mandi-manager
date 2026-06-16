import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type Party, type PartyType } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { fmtINR } from "@/lib/format";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/app/masters/parties")({
  component: PartiesPage,
});

function PartiesPage() {
  const { companyId, yearId, ready } = useScope();
  const [filter, setFilter] = useState<PartyType | "all">("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Party> | null>(null);

  const parties = useLiveQuery(
    async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []),
    [companyId, yearId, ready],
  ) ?? [];

  const filtered = parties.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.shortCode.toLowerCase().includes(s);
  });

  const save = async () => {
    if (!editing || !editing.name || !editing.type) return;
    const data: Party = {
      companyId, yearId,
      type: editing.type as PartyType,
      name: editing.name,
      shortCode: editing.shortCode || generateShortCode(editing.name, editing.type as PartyType),
      mobile: editing.mobile,
      village: editing.village,
      city: editing.city,
      openingBalance: Number(editing.openingBalance) || 0,
      openingType: (editing.openingType as "Dr" | "Cr") || "Cr",
      creditLimit: Number(editing.creditLimit) || undefined,
      createdAt: editing.createdAt ?? Date.now(),
    };
    if (editing.id) await db.parties.update(editing.id, data);
    else await db.parties.add(data);
    setEditing(null);
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="all">All Types</option>
          <option value="farmer">Farmers</option>
          <option value="buyer">Buyers</option>
          <option value="agent">Agents</option>
          <option value="expense">Expense</option>
          <option value="other">Other</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or short code…"
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
        />
        <button
          onClick={() => setEditing({ type: "buyer", openingType: "Dr", openingBalance: 0 })}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> New Party
        </button>
      </div>

      <div className="overflow-auto rounded border border-border bg-card">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Type</th><th>Mobile</th><th>Village/City</th>
              <th className="num">Opening</th><th>Type</th><th className="num">Credit Limit</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No parties found.</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="font-mono">{p.shortCode}</td>
                <td className="font-medium">{p.name}</td>
                <td><Pill type={p.type} /></td>
                <td className="tabular">{p.mobile ?? "—"}</td>
                <td>{p.village ?? p.city ?? "—"}</td>
                <td className="num">{fmtINR(p.openingBalance)}</td>
                <td><span className={p.openingType === "Dr" ? "text-debit" : "text-credit"}>{p.openingType}</span></td>
                <td className="num">{p.creditLimit ? fmtINR(p.creditLimit) : "—"}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(p)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                    <button
                      onClick={() => p.id && db.parties.delete(p.id)}
                      className="rounded p-1 text-destructive hover:bg-muted"
                    ><Trash2 className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <PartyEditor value={editing} onChange={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Pill({ type }: { type: PartyType }) {
  const colors: Record<PartyType, string> = {
    farmer: "bg-credit/15 text-credit",
    buyer: "bg-debit/15 text-debit",
    agent: "bg-chart-4/15 text-foreground",
    expense: "bg-muted text-foreground",
    other: "bg-muted text-foreground",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${colors[type]}`}>{type}</span>;
}

export function PartyEditor({
  value, onChange, onSave, onClose, lockType,
}: {
  value: Partial<Party>;
  onChange: (v: Partial<Party>) => void;
  onSave: () => void;
  onClose: () => void;
  lockType?: PartyType;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{value.id ? "Edit Party" : "New Party"}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Type">
            <select
              disabled={!!lockType}
              value={value.type ?? "buyer"}
              onChange={(e) => onChange({ ...value, type: e.target.value as PartyType })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="farmer">Farmer (Grower)</option>
              <option value="buyer">Buyer</option>
              <option value="agent">Agent</option>
              <option value="expense">Expense</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Short Code (auto if blank)">
            <input
              value={value.shortCode ?? ""}
              onChange={(e) => onChange({ ...value, shortCode: e.target.value.toUpperCase() })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-mono"
              placeholder="e.g. RAM01"
            />
          </Field>
          <Field label="Name *" full>
            <input
              autoFocus
              value={value.name ?? ""}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
              placeholder="Full name"
            />
          </Field>
          <Field label="Mobile">
            <input
              value={value.mobile ?? ""}
              onChange={(e) => onChange({ ...value, mobile: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs tabular"
            />
          </Field>
          <Field label="Village">
            <input
              value={value.village ?? ""}
              onChange={(e) => onChange({ ...value, village: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            />
          </Field>
          <Field label="City">
            <input
              value={value.city ?? ""}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            />
          </Field>
          <Field label="Credit Limit">
            <input
              type="number"
              value={value.creditLimit ?? ""}
              onChange={(e) => onChange({ ...value, creditLimit: Number(e.target.value) })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs tabular"
            />
          </Field>
          <Field label="Opening Balance">
            <input
              type="number"
              value={value.openingBalance ?? 0}
              onChange={(e) => onChange({ ...value, openingBalance: Number(e.target.value) })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs tabular"
            />
          </Field>
          <Field label="Opening Type">
            <select
              value={value.openingType ?? "Cr"}
              onChange={(e) => onChange({ ...value, openingType: e.target.value as "Dr" | "Cr" })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="Dr">Debit (Dr)</option>
              <option value="Cr">Credit (Cr)</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <button onClick={onClose} className="rounded border border-input px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button onClick={onSave} className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Save Party
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function generateShortCode(name: string, type: PartyType): string {
  const base = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || type.slice(0, 3).toUpperCase();
  const rand = Math.floor(Math.random() * 90 + 10);
  return `${base}${rand}`;
}
