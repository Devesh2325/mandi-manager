import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { db, type AppliedExpense, type Challan, type QualityRow, type SaleLine, type StockEntry, type Teep, type LedgerEntry } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR, fmtQty, todayISO } from "@/lib/format";
import { computeExpenses, round2 } from "@/lib/calc";
import { Plus, Trash2, Save, X, UserPlus, AlertCircle, Copy, Layers } from "lucide-react";
import { PartyEditor, generateShortCode } from "./app.masters.parties";

export const Route = createFileRoute("/app/entry/challan")({
  component: ChallanEntryPage,
});

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function ChallanEntryPage() {
  const { companyId, yearId, ready } = useScope();
  const navigate = useNavigate();

  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const sizes = useLiveQuery(async () => (ready ? await db.sizes.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const packings = useLiveQuery(async () => (ready ? await db.packings.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const expenseMasters = useLiveQuery(async () => (ready ? await db.expenseAccounts.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const farmers = parties.filter((p) => p.type === "farmer");
  const buyers = parties.filter((p) => p.type === "buyer");
  const agents = parties.filter((p) => p.type === "agent");

  // Distinct goods types from items
  const goodsTypes = useMemo(() => {
    const set = new Set<string>(items.map((i) => i.goodsType).filter(Boolean));
    ["Vegetable", "Fruit", "Grain"].forEach((g) => set.add(g));
    return Array.from(set);
  }, [items]);

  const [challanNo, setChallanNo] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saleDate, setSaleDate] = useState(todayISO());
  const [goodsType, setGoodsType] = useState("Vegetable");
  const [farmerId, setFarmerId] = useState<number | "">("");
  const [agentId, setAgentId] = useState<number | "">("");
  const [truckNo, setTruckNo] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const [fullPacks, setFullPacks] = useState<number>(0);
  const [halfPacks, setHalfPacks] = useState<number>(0);
  const [packMatrix, setPackMatrix] = useState<Record<string, { full: number; half: number }>>({});
  const [isCashSale, setIsCashSale] = useState(false);
  const [notes, setNotes] = useState("");
  // Per-sale opt-in size matrix (key = `${rowId}:${saleIdx}`).
  const [matrixOpen, setMatrixOpen] = useState<Record<string, boolean>>({});

  const [rows, setRows] = useState<QualityRow[]>([
    { id: uid(), lotNo: "", qty: 0, sales: [], matrix: {} },
  ]);

  // Auto challan no
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const last = await db.challans.where({ companyId, yearId }).count();
      setChallanNo(`CHN-${(last + 1).toString().padStart(4, "0")}`);
    })();
  }, [companyId, yearId, ready]);

  // Auto lot no on first row (only when farmer/date changes, not on every row edit)
  useEffect(() => {
    if (!farmerId) return;
    setRows((r) => {
      if (r.length !== 1 || r[0].lotNo) return r;
      const farmer = farmers.find((f) => f.id === farmerId);
      const code = farmer?.shortCode ?? "LOT";
      return r.map((row, i) => i === 0 ? { ...row, lotNo: `${date.replace(/-/g, "").slice(4)}-${code}-1` } : row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, date]);

  // Quick add party modal
  const [partyDraft, setPartyDraft] = useState<null | { target: "farmer" | "buyer" | "agent"; rowId?: string; saleIdx?: number }>(null);
  const [partyValue, setPartyValue] = useState<any>(null);

  const openPartyAdd = (target: "farmer" | "buyer" | "agent", rowId?: string, saleIdx?: number) => {
    setPartyDraft({ target, rowId, saleIdx });
    setPartyValue({ type: target, openingType: target === "farmer" ? "Cr" : "Dr", openingBalance: 0 });
  };

  const savePartyAdd = async () => {
    if (!partyDraft || !partyValue?.name) return;
    const id = await db.parties.add({
      companyId, yearId,
      type: partyDraft.target,
      name: partyValue.name,
      shortCode: partyValue.shortCode || generateShortCode(partyValue.name, partyDraft.target),
      mobile: partyValue.mobile,
      village: partyValue.village,
      city: partyValue.city,
      openingBalance: Number(partyValue.openingBalance) || 0,
      openingType: partyValue.openingType ?? (partyDraft.target === "farmer" ? "Cr" : "Dr"),
      createdAt: Date.now(),
    });
    if (partyDraft.target === "farmer") setFarmerId(id);
    else if (partyDraft.target === "agent") setAgentId(id);
    else if (partyDraft.target === "buyer" && partyDraft.rowId !== undefined && partyDraft.saleIdx !== undefined) {
      updateSale(partyDraft.rowId, partyDraft.saleIdx, { buyerId: id });
    }
    setPartyDraft(null);
    setPartyValue(null);
  };

  // Row actions
  const makeLot = (n: number) => {
    const farmer = farmers.find((f) => f.id === farmerId);
    const code = farmer?.shortCode ?? "LOT";
    return `${date.replace(/-/g, "").slice(4)}-${code}-${n}`;
  };
  const addRow = () =>
    setRows((r) => [...r, { id: uid(), lotNo: makeLot(r.length + 1), qty: 0, sales: [], matrix: {} }]);
  const duplicateRow = (id: string) =>
    setRows((r) => {
      const src = r.find((x) => x.id === id);
      if (!src) return r;
      const idx = r.findIndex((x) => x.id === id);
      const clone: QualityRow = {
        ...src,
        id: uid(),
        lotNo: makeLot(r.length + 1),
        sales: [],
        matrix: { ...(src.matrix ?? {}) },
      };
      const next = [...r];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  const addRowsForAllQualities = () => {
    if (qualities.length === 0) {
      toast.info("No qualities configured", { description: "Add qualities in Masters → Items first." });
      return;
    }
    const itemQs = qualities.filter((q) => !q.itemId || q.itemId === Number(itemId));
    setRows((r) => {
      const existingQ = new Set(r.map((x) => x.qualityId).filter(Boolean));
      const newOnes = itemQs
        .filter((q) => !existingQ.has(q.id))
        .map((q, i) => ({
          id: uid(),
          qualityId: q.id,
          lotNo: makeLot(r.length + i + 1),
          qty: 0,
          sales: [],
          matrix: {},
        }));
      // Replace a single blank row with the new set, otherwise append
      if (r.length === 1 && !r[0].qty && !r[0].qualityId && r[0].sales.length === 0) {
        return newOnes.length ? newOnes : r;
      }
      return [...r, ...newOnes];
    });
  };
  const delRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  const updateRow = (id: string, patch: Partial<QualityRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addSale = (rowId: string) =>
    setRows((r) => r.map((row) => row.id === rowId ? { ...row, sales: [...row.sales, { buyerId: 0, qty: 0, rate: 0, amount: 0, matrix: {} }] } : row));
  const updateSale = (rowId: string, idx: number, patch: Partial<SaleLine>) =>
    setRows((r) => r.map((row) => {
      if (row.id !== rowId) return row;
      const sales = row.sales.map((s, i) => i === idx ? { ...s, ...patch, amount: round2((patch.qty ?? s.qty) * (patch.rate ?? s.rate)) } : s);
      return { ...row, sales };
    }));
  const updateSaleMatrix = (rowId: string, idx: number, sizeKey: string, field: "qty" | "rate", val: number) =>
    setRows((r) => r.map((row) => {
      if (row.id !== rowId) return row;
      const sales = row.sales.map((s, i) => {
        if (i !== idx) return s;
        const m = { ...(s.matrix ?? {}) };
        const cur = m[sizeKey] ?? { qty: 0, rate: 0 };
        m[sizeKey] = { ...cur, [field]: val };
        const entries = Object.values(m);
        const qty = round2(entries.reduce((a, b) => a + (Number(b.qty) || 0), 0));
        const amount = round2(entries.reduce((a, b) => a + (Number(b.qty) || 0) * (Number(b.rate) || 0), 0));
        const rate = qty > 0 ? round2(amount / qty) : s.rate;
        return { ...s, matrix: m, qty, amount, rate };
      });
      return { ...row, sales };
    }));
  const delSale = (rowId: string, idx: number) =>
    setRows((r) => r.map((row) => row.id === rowId ? { ...row, sales: row.sales.filter((_, i) => i !== idx) } : row));

  // Aggregate totals
  const totals = useMemo(() => {
    let qty = 0, soldQty = 0, gross = 0;
    rows.forEach((r) => {
      qty += Number(r.qty) || 0;
      r.sales.forEach((s) => {
        soldQty += Number(s.qty) || 0;
        gross += Number(s.amount) || 0;
      });
    });
    const stockQty = qty - soldQty;
    const growerExp = computeExpenses(expenseMasters, soldQty, gross, "grower");
    const buyerExp = computeExpenses(expenseMasters, soldQty, gross, "buyer");
    const growerExpTotal = growerExp.reduce((a, b) => a + b.amount, 0);
    const buyerExpTotal = buyerExp.reduce((a, b) => a + b.amount, 0);
    const netGrower = round2(gross - growerExpTotal);
    const netBuyer = round2(gross + buyerExpTotal);
    return { qty, soldQty, stockQty, gross, growerExp, buyerExp, growerExpTotal, buyerExpTotal, netGrower, netBuyer };
  }, [rows, expenseMasters]);

  // Save
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = farmerId && itemId && rows.some((r) => r.qty > 0);

  const save = async () => {
    setError("");
    if (!canSave) {
      setError("Please pick farmer, item, and enter at least one quality row with qty.");
      return;
    }
    setSaving(true);
    try {
      const expenses: AppliedExpense[] = [...totals.growerExp, ...totals.buyerExp];

      const challan: Challan = {
        companyId, yearId,
        challanNo, date,
        saleDate: saleDate || undefined,
        goodsType,
        farmerId: Number(farmerId),
        agentId: agentId ? Number(agentId) : undefined,
        truckNo,
        itemId: Number(itemId),
        totalQty: totals.qty,
        fullPacks: Number(fullPacks) || undefined,
        halfPacks: Number(halfPacks) || undefined,
        packMatrix: Object.keys(packMatrix).length ? packMatrix : undefined,
        isCashSale: isCashSale || undefined,
        qualities: rows,
        expenses,
        notes,
        createdAt: Date.now(),
      };
      const challanId = await db.challans.add(challan);

      // Stock entry per row (qty in)
      const stockOps: StockEntry[] = rows.map((r) => ({
        companyId, yearId,
        challanId: challanId as number,
        itemId: Number(itemId),
        qualityId: r.qualityId,
        qtyIn: Number(r.qty) || 0,
        qtyOut: r.sales.reduce((a, b) => a + (Number(b.qty) || 0), 0),
        date,
      }));
      await db.stockEntries.bulkAdd(stockOps);

      // Teeps + ledger per buyer line
      const teepCount = await db.teeps.where({ companyId, yearId }).count();
      let n = teepCount;
      const teeps: Teep[] = [];
      const ledger: LedgerEntry[] = [];

      for (const r of rows) {
        for (const s of r.sales) {
          if (!s.buyerId || s.qty <= 0) continue;
          n += 1;
          const gross = round2(s.qty * s.rate);
          const buyerExp = computeExpenses(expenseMasters, s.qty, gross, "buyer");
          const growerExp = computeExpenses(expenseMasters, s.qty, gross, "grower");
          const buyerExpTotal = buyerExp.reduce((a, b) => a + b.amount, 0);
          const growerExpTotal = growerExp.reduce((a, b) => a + b.amount, 0);
          const teep: Teep = {
            companyId, yearId,
            teepNo: `TP-${n.toString().padStart(4, "0")}`,
            date: saleDate || date,
            challanId: challanId as number,
            buyerId: s.buyerId,
            itemId: Number(itemId),
            qualityId: r.qualityId,
            qty: s.qty,
            rate: s.rate,
            gross,
            expenses: [...buyerExp, ...growerExp],
            net: round2(gross - growerExpTotal),
          };
          teeps.push(teep);

          // Buyer Dr (gross + buyer expenses)
          ledger.push({
            companyId, yearId, date: saleDate || date,
            partyId: s.buyerId,
            refType: "teep", refId: 0,
            narration: `Purchase via ${challan.challanNo}`,
            debit: round2(gross + buyerExpTotal),
            credit: 0,
          });
          // Grower Cr (gross - grower expenses)
          ledger.push({
            companyId, yearId, date: saleDate || date,
            partyId: Number(farmerId),
            refType: "teep", refId: 0,
            narration: `Sale via ${challan.challanNo}`,
            debit: 0,
            credit: round2(gross - growerExpTotal),
          });
        }
      }
      if (teeps.length) await db.teeps.bulkAdd(teeps);
      if (ledger.length) await db.ledger.bulkAdd(ledger);

      toast.success(`Challan ${challan.challanNo} saved`, {
        description: `${rows.length} quality row(s), ${teeps.length} teep(s), ${ledger.length} ledger posting(s).`,
      });
      navigate({ to: "/app/teep" });
    } catch (e) {
      console.error("Challan save failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: Ctrl+S save, Ctrl+N new row — use refs to avoid re-binding listener every render
  const saveRef = useRef(save);
  const addRowRef = useRef(addRow);
  const canSaveRef = useRef(canSave);
  const savingRef = useRef(saving);
  saveRef.current = save;
  addRowRef.current = addRow;
  canSaveRef.current = canSave;
  savingRef.current = saving;
  useEffect(() => {
    // Cross-platform shortcuts. Ctrl+N is reserved by every browser (new window),
    // so we use Ctrl/Cmd+Enter for "add quality row" instead.
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (canSaveRef.current && !savingRef.current) saveRef.current();
      } else if (key === "enter") {
        e.preventDefault();
        e.stopPropagation();
        addRowRef.current();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, []);

  return (
    <>
      <TopBar
        title="Main Challan Entry"
        right={
          <div className="flex items-center gap-2">
            {!canSave && (
              <span className="hidden md:inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                {!farmerId ? "Pick farmer" : !itemId ? "Pick item" : "Enter qty in row"}
              </span>
            )}
            <button onClick={() => navigate({ to: "/app" })} className="rounded border border-input px-3 py-1.5 text-xs hover:bg-muted">
              <X className="mr-1 inline h-3 w-3" /> Cancel
            </button>
            <button
              onClick={() => { if (!canSave) { toast.warning("Cannot save", { description: !farmerId ? "Please select a farmer." : !itemId ? "Please select an item." : "Enter quantity in at least one quality row." }); return; } save(); }}
              disabled={saving}
              title={!canSave ? "Fill farmer, item and at least one row qty" : "Save challan"}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save (Ctrl+S)"}
            </button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Section A: Arrival */}
          <Section title="A · Arrival / GR Details">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <Field label="Challan #"><input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className="inp font-mono" /></Field>
              <Field label="Arrival Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="inp" /></Field>
              <Field label="Sale Date (S-DT)"><input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="inp" /></Field>
              <Field label="Goods Type">
                <select value={goodsType} onChange={(e) => { setGoodsType(e.target.value); setItemId(""); }} className="inp">
                  {goodsTypes.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Farmer (Grower) *">
                <PartyPicker
                  value={farmerId}
                  options={farmers}
                  onChange={(v) => setFarmerId(v)}
                  onAdd={() => openPartyAdd("farmer")}
                />
              </Field>
              <Field label="Agent">
                <PartyPicker
                  value={agentId}
                  options={agents}
                  onChange={(v) => setAgentId(v)}
                  onAdd={() => openPartyAdd("agent")}
                />
              </Field>
              <Field label="Truck No"><input value={truckNo} onChange={(e) => setTruckNo(e.target.value)} className="inp font-mono uppercase" placeholder="HR-55-1234" /></Field>
              <Field label="Item *">
                <select value={itemId} onChange={(e) => setItemId(Number(e.target.value) || "")} className="inp">
                  <option value="">— Select item —</option>
                  {items.filter((i) => i.goodsType === goodsType).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </Field>
              <Field label="Full Packs (total)"><input type="number" value={fullPacks || ""} onChange={(e) => setFullPacks(Number(e.target.value))} className="inp tabular text-right" /></Field>
              <Field label="Half Packs (total)"><input type="number" value={halfPacks || ""} onChange={(e) => setHalfPacks(Number(e.target.value))} className="inp tabular text-right" /></Field>
            </div>

            {/* Per-size Full/Half breakdown */}
            {sizes.length > 0 && (
              <div className="mt-3 rounded border border-border bg-muted/20 p-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pack Breakdown by Size (optional)
                </div>
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th></th>
                      {sizes.map((s) => <th key={s.id} className="num">{s.name}</th>)}
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["full", "half"] as const).map((kind) => {
                      const total = sizes.reduce((a, s) => a + (Number(packMatrix[String(s.id)]?.[kind]) || 0), 0);
                      return (
                        <tr key={kind}>
                          <td className="font-medium capitalize">{kind} Packs</td>
                          {sizes.map((s) => {
                            const key = String(s.id);
                            return (
                              <td key={s.id} className="num">
                                <input
                                  type="number"
                                  className="grid-input text-right"
                                  value={packMatrix[key]?.[kind] || ""}
                                  onChange={(e) => {
                                    setPackMatrix((m) => {
                                      const cur = m[key] ?? { full: 0, half: 0 };
                                      return { ...m, [key]: { ...cur, [kind]: Number(e.target.value) } };
                                    });
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td className="num tabular font-semibold">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Toggles row */}
            <div className="mt-3 flex flex-wrap items-center gap-4 rounded border border-border bg-muted/30 px-3 py-2 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={isCashSale} onChange={(e) => setIsCashSale(e.target.checked)} className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wider text-destructive">Cash Sale</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={qtyMatch} onChange={(e) => setQtyMatch(e.target.checked)} className="h-3.5 w-3.5" />
                <span>Qty Match (auto-summed from rows)</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={useSaleRate} onChange={(e) => setUseSaleRate(e.target.checked)} className="h-3.5 w-3.5" />
                <span>Use Sale Rate (override matrix rates)</span>
              </label>
              <span className="ml-auto text-[11px] text-muted-foreground">
                Total Arrival Qty: <span className="tabular font-semibold text-foreground">{fmtQty(totals.qty)}</span>
              </span>
            </div>
          </Section>

          {/* Section B + D: Multi quality with inline buyers */}
          <Section
            title="B · Quality Rows  ·  D · Inline Buyer Sale"
            action={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={addRowsForAllQualities}
                  title="Add one row per configured quality"
                  className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Layers className="h-3 w-3" /> Add All Qualities
                </button>
                <button onClick={addRow} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                  <Plus className="h-3 w-3" /> Add Row (Ctrl+Enter)
                </button>
              </div>
            }
          >
            {rows.map((row, ri) => (
              <div key={row.id} className="mb-3 overflow-hidden rounded border border-border bg-card">
                {/* Quality header */}
                <div className="grid grid-cols-12 items-end gap-2 border-b border-border bg-muted/40 p-2">
                  <div className="col-span-1 text-[10px] font-semibold uppercase text-muted-foreground">#{ri + 1}</div>
                  <Field label="Quality" sm>
                    <select value={row.qualityId ?? ""} onChange={(e) => updateRow(row.id, { qualityId: Number(e.target.value) || undefined })} className="inp">
                      <option value="">—</option>
                      {qualities.filter((q) => !q.itemId || q.itemId === Number(itemId)).map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Lot No" sm><input value={row.lotNo} onChange={(e) => updateRow(row.id, { lotNo: e.target.value })} className="inp font-mono" /></Field>
                  <Field label="Size" sm>
                    <select value={row.sizeId ?? ""} onChange={(e) => updateRow(row.id, { sizeId: Number(e.target.value) || undefined })} className="inp">
                      <option value="">—</option>
                      {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Qty" sm><input type="number" value={row.qty || ""} onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })} className="inp tabular text-right" /></Field>
                  <Field label="Packing" sm>
                    <select value={row.packingId ?? ""} onChange={(e) => updateRow(row.id, { packingId: Number(e.target.value) || undefined })} className="inp">
                      <option value="">—</option>
                      {packings.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isReturnable ? " (R)" : ""}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-3 flex items-end justify-end gap-2">
                    <div className="text-right text-[11px] text-muted-foreground">
                      Sold: <span className="text-foreground tabular">{fmtQty(row.sales.reduce((a, b) => a + (Number(b.qty) || 0), 0))}</span> ·
                      Stock: <span className={`tabular ${row.qty - row.sales.reduce((a, b) => a + (Number(b.qty) || 0), 0) > 0 ? "text-credit" : "text-foreground"}`}>
                        {fmtQty(row.qty - row.sales.reduce((a, b) => a + (Number(b.qty) || 0), 0))}
                      </span>
                    </div>
                    <button onClick={() => duplicateRow(row.id)} title="Duplicate this row" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delRow(row.id)} title="Delete row" className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                {/* Section C: Sub Packing Matrix */}
                <div className="border-b border-border p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">C · Sub Packing Matrix</div>
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th></th>
                        {sizes.map((s) => <th key={s.id} className="num">{s.name}</th>)}
                        <th className="num">Total Qty</th>
                        <th className="num">Avg Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const entries = Object.values(row.matrix ?? {});
                        const totalQty = entries.reduce((a, b) => a + (Number(b.qty) || 0), 0);
                        const totalAmt = entries.reduce((a, b) => a + (Number(b.qty) || 0) * (Number(b.rate) || 0), 0);
                        const avgRate = totalQty > 0 ? totalAmt / totalQty : 0;
                        return (
                          <>
                            <tr>
                              <td className="font-medium">Qty</td>
                              {sizes.map((s) => (
                                <td key={s.id} className="num">
                                  <input
                                    type="number"
                                    className="grid-input text-right"
                                    value={row.matrix?.[String(s.id)]?.qty || ""}
                                    onChange={(e) => {
                                      const m = { ...(row.matrix ?? {}) };
                                      const key = String(s.id);
                                      m[key] = { qty: Number(e.target.value), rate: m[key]?.rate ?? 0 };
                                      updateRow(row.id, { matrix: m });
                                    }}
                                  />
                                </td>
                              ))}
                              <td className="num tabular">{fmtQty(totalQty)}</td>
                              <td className="num tabular font-semibold text-primary">
                                {avgRate > 0 ? fmtINR(round2(avgRate)) : "—"}
                              </td>
                            </tr>
                            <tr>
                              <td className="font-medium">Rate</td>
                              {sizes.map((s) => (
                                <td key={s.id} className="num">
                                  <input
                                    type="number"
                                    className="grid-input text-right"
                                    value={row.matrix?.[String(s.id)]?.rate || ""}
                                    onChange={(e) => {
                                      const m = { ...(row.matrix ?? {}) };
                                      const key = String(s.id);
                                      m[key] = { qty: m[key]?.qty ?? 0, rate: Number(e.target.value) };
                                      updateRow(row.id, { matrix: m });
                                    }}
                                  />
                                </td>
                              ))}
                              <td className="num tabular text-muted-foreground">{fmtINR(round2(totalAmt))}</td>
                              <td className="num text-muted-foreground">—</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Inline buyer sale */}
                <div className="p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">D · Inline Sale (Buyers)</div>
                    <button onClick={() => addSale(row.id)} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20">
                      <Plus className="h-3 w-3" /> Add Buyer
                    </button>
                  </div>
                  {row.sales.length === 0 && (
                    <div className="py-3 text-center text-xs italic text-muted-foreground">No buyer = full qty goes to stock</div>
                  )}
                  {row.sales.map((s, si) => {
                    const grossLine = s.amount;
                    const buyerExpLine = computeExpenses(expenseMasters, s.qty, grossLine, "buyer");
                    const buyerNet = round2(grossLine + buyerExpLine.reduce((a, b) => a + b.amount, 0));
                    const hasMatrix = Object.values(s.matrix ?? {}).some((c) => (c.qty || 0) > 0 || (c.rate || 0) > 0);
                    return (
                      <div key={si} className="mb-2 rounded border border-border bg-background">
                        {/* Buyer header line */}
                        <div className="grid grid-cols-12 items-end gap-2 border-b border-border bg-muted/20 p-2">
                          <div className="col-span-4">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Buyer</label>
                            <BuyerPicker
                              value={s.buyerId}
                              options={buyers}
                              onChange={(v) => updateSale(row.id, si, { buyerId: v as number })}
                              onAdd={() => openPartyAdd("buyer", row.id, si)}
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</label>
                            <input type="number" disabled={hasMatrix} className="inp tabular text-right disabled:opacity-60" value={s.qty || ""} onChange={(e) => updateSale(row.id, si, { qty: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-1">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rate</label>
                            <input type="number" disabled={hasMatrix} className="inp tabular text-right disabled:opacity-60" value={s.rate || ""} onChange={(e) => updateSale(row.id, si, { rate: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-[10px] uppercase text-muted-foreground">Gross</div>
                            <div className="tabular text-sm font-semibold">{fmtINR(grossLine)}</div>
                          </div>
                          <div className="col-span-3 text-right">
                            <div className="text-[10px] uppercase text-muted-foreground">Net (after buyer exp)</div>
                            <div className="tabular text-sm font-semibold text-credit">{fmtINR(buyerNet)}</div>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => delSale(row.id, si)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>

                        {/* Per-buyer size matrix */}
                        <div className="p-2">
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Buyer Size Matrix {hasMatrix && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">active — overrides Qty/Rate</span>}
                            </div>
                          </div>
                          <table className="grid-table">
                            <thead>
                              <tr>
                                <th></th>
                                {sizes.map((sz) => <th key={sz.id} className="num">{sz.name}</th>)}
                                <th className="num">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="font-medium">Qty</td>
                                {sizes.map((sz) => (
                                  <td key={sz.id} className="num">
                                    <input
                                      type="number"
                                      className="grid-input text-right"
                                      value={s.matrix?.[String(sz.id)]?.qty || ""}
                                      onChange={(e) => updateSaleMatrix(row.id, si, String(sz.id), "qty", Number(e.target.value))}
                                    />
                                  </td>
                                ))}
                                <td className="num tabular font-semibold">{fmtQty(s.qty)}</td>
                              </tr>
                              <tr>
                                <td className="font-medium">Rate</td>
                                {sizes.map((sz) => (
                                  <td key={sz.id} className="num">
                                    <input
                                      type="number"
                                      className="grid-input text-right"
                                      value={s.matrix?.[String(sz.id)]?.rate || ""}
                                      onChange={(e) => updateSaleMatrix(row.id, si, String(sz.id), "rate", Number(e.target.value))}
                                    />
                                  </td>
                                ))}
                                <td className="num tabular font-semibold text-primary">{fmtINR(s.amount)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Friendly footer: big add button + per-quality quick chips */}
            <div className="mt-2 flex flex-col gap-2 rounded border border-dashed border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Quality Row
                </button>
                <span className="text-[11px] text-muted-foreground">or quick-add by quality:</span>
                {qualities
                  .filter((q) => !q.itemId || q.itemId === Number(itemId))
                  .map((q) => (
                    <button
                      key={q.id}
                      onClick={() =>
                        setRows((r) => [
                          ...r,
                          { id: uid(), qualityId: q.id, lotNo: makeLot(r.length + 1), qty: 0, sales: [], matrix: {} },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-0.5 text-[11px] font-medium hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus className="h-2.5 w-2.5" /> {q.name}
                    </button>
                  ))}
                {qualities.length === 0 && (
                  <span className="text-[11px] italic text-muted-foreground">
                    No qualities configured — add in Masters → Items
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Tip: press <kbd className="rounded border border-input bg-background px-1">Ctrl</kbd>+<kbd className="rounded border border-input bg-background px-1">Enter</kbd> to add a blank row, or click <Copy className="inline h-3 w-3" /> on any row to duplicate it.
              </div>
            </div>
          </Section>

          <Section title="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded border border-input bg-background p-2 text-xs" placeholder="Internal notes for this challan…" />
          </Section>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
        </div>

        {/* Sticky totals panel */}
        <aside className="hidden w-72 shrink-0 border-l border-border bg-card lg:block">
          <div className="sticky top-0 flex h-full flex-col">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Totals</div>
            <div className="flex-1 space-y-3 overflow-auto p-3 text-sm">
              <Row label="Total Arrival Qty" value={fmtQty(totals.qty)} />
              <Row label="Sold Qty" value={fmtQty(totals.soldQty)} />
              <Row label="To Stock" value={fmtQty(totals.stockQty)} accent={totals.stockQty > 0 ? "credit" : undefined} />
              <hr className="border-border" />
              <Row label="Gross Sale" value={fmtINR(totals.gross)} bold />

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Grower-side Expenses</div>
                {totals.growerExp.length === 0 && <div className="text-xs italic text-muted-foreground">—</div>}
                {totals.growerExp.map((e, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{e.name}</span>
                    <span className="tabular text-debit">−{fmtINR(e.amount)}</span>
                  </div>
                ))}
                <Row label="Net to Grower" value={fmtINR(totals.netGrower)} bold accent="credit" />
              </div>

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Buyer-side Expenses</div>
                {expenseMasters.filter((m) => m.applyOn === "buyer" || m.applyOn === "both").length === 0 ? (
                  <div className="rounded border border-dashed border-border bg-muted/30 p-2 text-[11px] italic text-muted-foreground">
                    No buyer-side expense master configured. Add one in <span className="font-semibold">Masters → Expenses</span> with Apply On = Buyer (or Both).
                  </div>
                ) : totals.buyerExp.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground">— (no sale entered yet)</div>
                ) : (
                  totals.buyerExp.map((e, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{e.name}</span>
                      <span className="tabular text-debit">+{fmtINR(e.amount)}</span>
                    </div>
                  ))
                )}
                <Row label="Buyer Total Payable" value={fmtINR(totals.netBuyer)} bold accent="debit" />
              </div>
            </div>

            <div className="border-t border-border p-3">
              <button
                onClick={save}
                disabled={!canSave || saving}
                className="w-full rounded bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Challan (Ctrl+S)"}
              </button>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Auto: Teep generated · Stock updated · Ledger posted
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Quick add party modal (re-using PartyEditor) */}
      {partyDraft && partyValue && (
        <PartyEditor
          value={partyValue}
          onChange={setPartyValue}
          onSave={savePartyAdd}
          onClose={() => { setPartyDraft(null); setPartyValue(null); }}
          lockType={partyDraft.target}
        />
      )}

      <style>{`
        .inp {
          width: 100%;
          border: 1px solid var(--input);
          background: var(--background);
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
          font-variant-numeric: tabular-nums;
        }
        .inp:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
      `}</style>
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, sm }: { label: string; children: React.ReactNode; sm?: boolean }) {
  return (
    <div className={sm ? "col-span-2" : ""}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: "credit" | "debit" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`tabular ${bold ? "text-base font-semibold" : "text-sm"} ${accent === "credit" ? "text-credit" : accent === "debit" ? "text-debit" : ""}`}>{value}</span>
    </div>
  );
}

function PartyPicker({
  value, options, onChange, onAdd,
}: {
  value: number | "";
  options: { id?: number; name: string; shortCode: string }[];
  onChange: (v: number | "") => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-1">
      <select value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")} className="inp flex-1">
        <option value="">— Select —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.shortCode} · {o.name}</option>)}
      </select>
      <button type="button" onClick={onAdd} title="Quick add party" className="rounded border border-input bg-background px-2 hover:bg-muted">
        <UserPlus className="h-3 w-3" />
      </button>
    </div>
  );
}

function BuyerPicker(props: React.ComponentProps<typeof PartyPicker>) {
  return <PartyPicker {...props} />;
}
