import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type Item, type Quality, type Size } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/masters/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const { companyId, yearId, ready } = useScope();

  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const sizes = useLiveQuery(async () => (ready ? await db.sizes.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-3">
      <ItemsTable items={items} companyId={companyId} yearId={yearId} />
      <QualitiesTable qualities={qualities} items={items} companyId={companyId} yearId={yearId} />
      <SimpleTable<Size>
        title="Sizes"
        rows={sizes}
        onAdd={(name) => db.sizes.add({ companyId, yearId, name })}
        onDel={(id) => db.sizes.delete(id)}
      />
    </div>
  );
}

function QualitiesTable({ qualities, items, companyId, yearId }: { qualities: Quality[]; items: Item[]; companyId: number; yearId: number }) {
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const add = async () => {
    if (!name.trim()) return;
    await db.qualities.add({ companyId, yearId, name: name.trim(), itemId: itemId ? Number(itemId) : undefined });
    setName("");
  };
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualities</div>
      <div className="space-y-2 border-b border-border p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Quality name" className="w-full rounded border border-input bg-background px-2 py-1 text-xs" onKeyDown={(e) => e.key === "Enter" && add()} />
        <div className="flex gap-2">
          <select value={itemId} onChange={(e) => setItemId(Number(e.target.value) || "")} className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs">
            <option value="">— All items —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={add} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /></button>
        </div>
      </div>
      <table className="grid-table">
        <thead><tr><th>Name</th><th>Item</th><th></th></tr></thead>
        <tbody>
          {qualities.map((q) => {
            const it = items.find((x) => x.id === q.itemId);
            return (
              <tr key={q.id}>
                <td className="font-medium">{q.name}</td>
                <td className="text-muted-foreground">{it?.name ?? "All"}</td>
                <td><button onClick={() => q.id && db.qualities.delete(q.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ItemsTable({ items, companyId, yearId }: { items: Item[]; companyId: number; yearId: number }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Kg");
  const [goodsType, setGoodsType] = useState("Vegetable");
  const add = async () => {
    if (!name.trim()) return;
    const code = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    await db.items.add({ companyId, yearId, name: name.trim(), shortCode: code, unit, goodsType });
    setName("");
  };
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</div>
      <div className="space-y-2 border-b border-border p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="w-full rounded border border-input bg-background px-2 py-1 text-xs" onKeyDown={(e) => e.key === "Enter" && add()} />
        <div className="flex gap-2">
          <select value={goodsType} onChange={(e) => setGoodsType(e.target.value)} className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs">
            <option>Vegetable</option><option>Fruit</option><option>Grain</option><option>Other</option>
          </select>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-xs">
            <option>Kg</option><option>Quintal</option><option>Crate</option><option>Box</option>
          </select>
          <button onClick={add} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /></button>
        </div>
      </div>
      <table className="grid-table">
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Unit</th><th></th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="font-mono">{i.shortCode}</td>
              <td className="font-medium">{i.name}</td>
              <td>{i.goodsType}</td>
              <td>{i.unit}</td>
              <td><button onClick={() => i.id && db.items.delete(i.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable<T extends { id?: number; name: string }>({
  title, rows, onAdd, onDel,
}: { title: string; rows: T[]; onAdd: (name: string) => Promise<unknown>; onDel: (id: number) => Promise<unknown> }) {
  const [name, setName] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    await onAdd(name.trim());
    setName("");
  };
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex gap-2 border-b border-border p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.slice(0, -1).toLowerCase()}…`} className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /></button>
      </div>
      <table className="grid-table">
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-medium">{r.name}</td>
              <td><button onClick={() => r.id && onDel(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
