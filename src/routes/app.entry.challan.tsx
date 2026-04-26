import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { db, type AppliedExpense, type Challan, type QualityRow, type SaleLine, type StockEntry, type Teep, type LedgerEntry } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR, fmtQty, todayISO } from "@/lib/format";
import { computeExpenses, round2 } from "@/lib/calc";
import { Plus, Trash2, Save, X, UserPlus, AlertCircle } from "lucide-react";
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
  const [trGrNo, setTrGrNo] = useState("");
  const [sender, setSender] = useState("");
  const [partyCd, setPartyCd] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const [totalQty, setTotalQty] = useState<number>(0);
  const [fullPacks, setFullPacks] = useState<number>(0);
  const [halfPacks, setHalfPacks] = useState<number>(0);
  const [netWt, setNetWt] = useState<number>(0);
  const [isCashSale, setIsCashSale] = useState(false);
  const [qtyMatch, setQtyMatch] = useState(true);
  const [useSaleRate, setUseSaleRate] = useState(false);
  const [notes, setNotes] = useState("");

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
  const addRow = () => setRows((r) => [...r, { id: uid(), lotNo: "", qty: 0, sales: [], matrix: {} }]);
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
        trGrNo: trGrNo || undefined,
        sender: sender || undefined,
        partyCd: partyCd || undefined,
        itemId: Number(itemId),
        totalQty: Number(totalQty) || totals.qty,
        fullPacks: Number(fullPacks) || undefined,
        halfPacks: Number(halfPacks) || undefined,
        netWt: Number(netWt) || undefined,
        isCashSale: isCashSale || undefined,
        qtyMatch,
        useSaleRate,
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
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSaveRef.current && !savingRef.current) saveRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addRowRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
              <Field label="Party Cd (cash)"><input value={partyCd} onChange={(e) => setPartyCd(e.target.value.toUpperCase())} className="inp font-mono uppercase" placeholder="—" /></Field>
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
              <Field label="TR / GR #"><input value={trGrNo} onChange={(e) => setTrGrNo(e.target.value)} className="inp font-mono" placeholder="89797" /></Field>
              <Field label="Sender"><input value={sender} onChange={(e) => setSender(e.target.value)} className="inp" placeholder="9898" /></Field>
              <Field label="Item *">
                <select value={itemId} onChange={(e) => setItemId(Number(e.target.value) || "")} className="inp">
                  <option value="">— Select item —</option>
                  {items.filter((i) => i.goodsType === goodsType).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </Field>
              <Field label="Total Qty (TQty)">
                <input type="number" value={totalQty || ""} onChange={(e) => setTotalQty(Number(e.target.value))} className="inp tabular text-right" placeholder={fmtQty(totals.qty)} />
              </Field>
              <Field label="Full Packs"><input type="number" value={fullPacks || ""} onChange={(e) => setFullPacks(Number(e.target.value))} className="inp tabular text-right" /></Field>
              <Field label="Half Packs"><input type="number" value={halfPacks || ""} onChange={(e) => setHalfPacks(Number(e.target.value))} className="inp tabular text-right" /></Field>
              <Field label="Net Wt (nwt)"><input type="number" value={netWt || ""} onChange={(e) => setNetWt(Number(e.target.value))} className="inp tabular text-right" /></Field>
            </div>

            {/* Toggles row */}
            <div className="mt-3 flex flex-wrap items-center gap-4 rounded border border-border bg-muted/30 px-3 py-2 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={isCashSale} onChange={(e) => setIsCashSale(e.target.checked)} className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wider text-destructive">Cash Sale</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={qtyMatch} onChange={(e) => setQtyMatch(e.target.checked)} className="h-3.5 w-3.5" />
                <span>Qty Match (TQty must equal sum of rows)</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={useSaleRate} onChange={(e) => setUseSaleRate(e.target.checked)} className="h-3.5 w-3.5" />
                <span>Use Sale Rate (override matrix rates)</span>
              </label>
              {qtyMatch && totalQty > 0 && totalQty !== totals.qty && (
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Mismatch: TQty {fmtQty(totalQty)} vs rows {fmtQty(totals.qty)}
                </span>
              )}
            </div>
          </Section>

          {/* Section B + D: Multi quality with inline buyers */}
          <Section
            title="B · Quality Rows  ·  D · Inline Buyer Sale"
            action={<button onClick={addRow} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"><Plus className="h-3 w-3" /> Add Quality Row (Ctrl+N)</button>}
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
                    <button onClick={() => delRow(row.id)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
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
                  <table className="grid-table">
                    <thead>
                      <tr><th>Buyer</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th className="num">Net (after exp)</th><th></th></tr>
                    </thead>
                    <tbody>
                      {row.sales.length === 0 && (
                        <tr><td colSpan={6} className="py-3 text-center text-muted-foreground italic">No buyer = full qty goes to stock</td></tr>
                      )}
                      {row.sales.map((s, si) => {
                        const grossLine = s.amount;
                        const buyerExp = computeExpenses(expenseMasters, s.qty, grossLine, "buyer");
                        const buyerNet = round2(grossLine + buyerExp.reduce((a, b) => a + b.amount, 0));
                        return (
                          <tr key={si}>
                            <td>
                              <BuyerPicker
                                value={s.buyerId}
                                options={buyers}
                                onChange={(v) => updateSale(row.id, si, { buyerId: v as number })}
                                onAdd={() => openPartyAdd("buyer", row.id, si)}
                              />
                            </td>
                            <td><input type="number" className="grid-input text-right" value={s.qty || ""} onChange={(e) => updateSale(row.id, si, { qty: Number(e.target.value) })} /></td>
                            <td><input type="number" className="grid-input text-right" value={s.rate || ""} onChange={(e) => updateSale(row.id, si, { rate: Number(e.target.value) })} /></td>
                            <td className="num tabular font-semibold">{fmtINR(grossLine)}</td>
                            <td className="num tabular text-credit">{fmtINR(buyerNet)}</td>
                            <td><button onClick={() => delSale(row.id, si)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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
                {totals.buyerExp.length === 0 && <div className="text-xs italic text-muted-foreground">—</div>}
                {totals.buyerExp.map((e, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{e.name}</span>
                    <span className="tabular text-debit">+{fmtINR(e.amount)}</span>
                  </div>
                ))}
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
