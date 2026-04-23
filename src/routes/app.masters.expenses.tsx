import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type ExpenseAccount, type Packing } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/masters/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const { companyId, yearId, ready } = useScope();

  const expenses = useLiveQuery(async () => (ready ? await db.expenseAccounts.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const packings = useLiveQuery(async () => (ready ? await db.packings.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <ExpensesTable rows={expenses} companyId={companyId} yearId={yearId} />
      <PackingTable rows={packings} companyId={companyId} yearId={yearId} />
    </div>
  );
}

function ExpensesTable({ rows, companyId, yearId }: { rows: ExpenseAccount[]; companyId: number; yearId: number }) {
  const [draft, setDraft] = useState<Partial<ExpenseAccount>>({
    name: "", operator: "percent", value: 0, side: "debit", applyOn: "grower", isPreset: false,
  });
  const add = async () => {
    if (!draft.name) return;
    await db.expenseAccounts.add({
      companyId, yearId,
      name: draft.name,
      operator: draft.operator!,
      value: Number(draft.value) || 0,
      side: draft.side!,
      applyOn: draft.applyOn!,
      isPreset: false,
    });
    setDraft({ name: "", operator: "percent", value: 0, side: "debit", applyOn: "grower", isPreset: false });
  };
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Expense Master (APMC, Dalali, Hamali, …)
      </div>
      <div className="grid grid-cols-6 gap-2 border-b border-border p-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="col-span-2 rounded border border-input bg-background px-2 py-1 text-xs" />
        <select value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value as any })} className="rounded border border-input bg-background px-2 py-1 text-xs">
          <option value="fix">Fix</option><option value="percent">%</option><option value="perUnit">/Unit</option>
        </select>
        <input type="number" value={draft.value as number} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} placeholder="Value" className="rounded border border-input bg-background px-2 py-1 text-xs tabular" />
        <select value={draft.applyOn} onChange={(e) => setDraft({ ...draft, applyOn: e.target.value as any })} className="rounded border border-input bg-background px-2 py-1 text-xs">
          <option value="grower">Grower</option><option value="buyer">Buyer</option><option value="both">Both</option>
        </select>
        <button onClick={add} className="inline-flex items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /> Add</button>
      </div>
      <table className="grid-table">
        <thead><tr><th>Name</th><th>Operator</th><th className="num">Value</th><th>Side</th><th>Apply On</th><th>Source</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-medium">{r.name}</td>
              <td>{r.operator === "fix" ? "Fix" : r.operator === "percent" ? "%" : "/Unit"}</td>
              <td className="num tabular">{r.value}</td>
              <td><span className={r.side === "debit" ? "text-debit" : "text-credit"}>{r.side === "debit" ? "Dr" : "Cr"}</span></td>
              <td className="capitalize">{r.applyOn}</td>
              <td className="text-[10px] uppercase opacity-70">{r.isPreset ? "Preset" : "Manual"}</td>
              <td><button onClick={() => r.id && db.expenseAccounts.delete(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackingTable({ rows, companyId, yearId }: { rows: Packing[]; companyId: number; yearId: number }) {
  const [name, setName] = useState("");
  const [ret, setRet] = useState(false);
  const add = async () => {
    if (!name.trim()) return;
    await db.packings.add({ companyId, yearId, name: name.trim(), isReturnable: ret });
    setName(""); setRet(false);
  };
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Packing (Crate / Bag / Box)
      </div>
      <div className="flex gap-2 border-b border-border p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Packing type" className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={ret} onChange={(e) => setRet(e.target.checked)} /> Returnable
        </label>
        <button onClick={add} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /></button>
      </div>
      <table className="grid-table">
        <thead><tr><th>Name</th><th>Returnable</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-medium">{r.name}</td>
              <td>{r.isReturnable ? "Yes" : "No"}</td>
              <td><button onClick={() => r.id && db.packings.delete(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
