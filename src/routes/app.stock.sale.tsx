import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db, type AppliedExpense } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR, fmtQty, todayISO } from "@/lib/format";
import { computeExpenses, round2 } from "@/lib/calc";
import { Save, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/stock/sale")({
  component: StockSalePage,
});

interface StockBalanceRow {
  key: string;
  challanId: number;
  challanNo: string;
  farmerId: number;
  itemId: number;
  qualityId?: number;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  date: string;
}

function StockSalePage() {
  const { companyId, yearId, ready } = useScope();
  const navigate = useNavigate();

  const stock = useLiveQuery(async () => (ready ? await db.stockEntries.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const challans = useLiveQuery(async () => (ready ? await db.challans.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const expenseMasters = useLiveQuery(async () => (ready ? await db.expenseAccounts.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const buyers = parties.filter((p) => p.type === "buyer");

  // Build remaining-stock balance grouped by challan + item + quality
  const balances = useMemo<StockBalanceRow[]>(() => {
    const map = new Map<string, StockBalanceRow>();
    stock.forEach((s) => {
      const key = `${s.challanId}-${s.itemId}-${s.qualityId ?? 0}`;
      const ch = challans.find((c) => c.id === s.challanId);
      const cur = map.get(key) ?? {
        key,
        challanId: s.challanId,
        challanNo: ch?.challanNo ?? `#${s.challanId}`,
        farmerId: ch?.farmerId ?? 0,
        itemId: s.itemId,
        qualityId: s.qualityId,
        qtyIn: 0,
        qtyOut: 0,
        balance: 0,
        date: ch?.date ?? s.date,
      };
      cur.qtyIn += s.qtyIn;
      cur.qtyOut += s.qtyOut;
      cur.balance = round2(cur.qtyIn - cur.qtyOut);
      map.set(key, cur);
    });
    return Array.from(map.values()).filter((r) => r.balance > 0);
  }, [stock, challans]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const selected = balances.find((b) => b.key === selectedKey);

  const [date, setDate] = useState(todayISO());
  const [buyerId, setBuyerId] = useState<number | "">("");
  const [qty, setQty] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [teepNo, setTeepNo] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const c = await db.teeps.where({ companyId, yearId }).count();
      setTeepNo(`TP-${(c + 1).toString().padStart(4, "0")}`);
    })();
  }, [companyId, yearId, ready]);

  // Auto-fill qty when selecting a stock row
  useEffect(() => {
    if (selected) setQty(selected.balance);
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gross = round2(qty * rate);
  const buyerExp = useMemo(() => computeExpenses(expenseMasters, qty, gross, "buyer"), [expenseMasters, qty, gross]);
  const growerExp = useMemo(() => computeExpenses(expenseMasters, qty, gross, "grower"), [expenseMasters, qty, gross]);
  const buyerExpTotal = buyerExp.reduce((a, b) => a + b.amount, 0);
  const growerExpTotal = growerExp.reduce((a, b) => a + b.amount, 0);
  const buyerNet = round2(gross + buyerExpTotal);
  const growerNet = round2(gross - growerExpTotal);

  const canSave = !!selected && !!buyerId && qty > 0 && rate > 0 && qty <= (selected?.balance ?? 0);

  const save = async () => {
    if (!selected || !buyerId) return;
    if (qty > selected.balance) {
      toast.error(`Qty exceeds available balance (${fmtQty(selected.balance)})`);
      return;
    }

    const allExp: AppliedExpense[] = [...buyerExp, ...growerExp];
    const teepId = await db.teeps.add({
      companyId, yearId, teepNo, date,
      challanId: selected.challanId,
      buyerId: Number(buyerId),
      itemId: selected.itemId,
      qualityId: selected.qualityId,
      qty, rate, gross, expenses: allExp, net: buyerNet,
    });

    // Stock out
    await db.stockEntries.add({
      companyId, yearId,
      challanId: selected.challanId,
      itemId: selected.itemId,
      qualityId: selected.qualityId,
      qtyIn: 0,
      qtyOut: qty,
      date,
    });

    // Ledger: Buyer Dr (gross + buyer-side expenses)
    await db.ledger.add({
      companyId, yearId, date,
      partyId: Number(buyerId),
      refType: "teep", refId: teepId as number,
      narration: `Sale ${teepNo} · ${selected.challanNo}`,
      debit: buyerNet, credit: 0,
    });

    // Ledger: Farmer Cr (gross − grower-side expenses)
    if (selected.farmerId) {
      await db.ledger.add({
        companyId, yearId, date,
        partyId: selected.farmerId,
        refType: "teep", refId: teepId as number,
        narration: `Sale ${teepNo} · ${selected.challanNo}`,
        debit: 0, credit: growerNet,
      });
    }

    toast.success(`Teep ${teepNo} saved`);
    navigate({ to: "/app/teep" });
  };

  return (
    <>
      <TopBar title="Sell Remaining Stock" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_420px]">
        {/* Left: stock list */}
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available Stock — pick a lot to sell
          </div>
          <div className="overflow-auto">
            <table className="grid-table">
              <thead>
                <tr><th></th><th>Date</th><th>Challan</th><th>Farmer</th><th>Item</th><th>Quality</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th></tr>
              </thead>
              <tbody>
                {balances.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No remaining stock. Save a Challan to add stock.</td></tr>
                )}
                {balances.map((b) => {
                  const it = items.find((x) => x.id === b.itemId);
                  const q = qualities.find((x) => x.id === b.qualityId);
                  const f = parties.find((x) => x.id === b.farmerId);
                  const active = b.key === selectedKey;
                  return (
                    <tr key={b.key} onClick={() => setSelectedKey(b.key)} className={`cursor-pointer ${active ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                      <td><input type="radio" checked={active} onChange={() => setSelectedKey(b.key)} /></td>
                      <td className="tabular">{b.date}</td>
                      <td className="font-mono">{b.challanNo}</td>
                      <td>{f?.name ?? "—"}</td>
                      <td className="font-medium">{it?.name ?? "—"}</td>
                      <td>{q?.name ?? "—"}</td>
                      <td className="num tabular">{fmtQty(b.qtyIn)}</td>
                      <td className="num tabular text-debit">{fmtQty(b.qtyOut)}</td>
                      <td className="num tabular font-semibold text-credit">{fmtQty(b.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: sale form */}
        <div className="rounded border border-border bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Details</div>

          {!selected && (
            <div className="mb-3 flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> Select a stock lot from the list.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <L label="Teep #"><input value={teepNo} onChange={(e) => setTeepNo(e.target.value)} className="inp font-mono" /></L>
            <L label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="inp" /></L>
            <L label="Buyer" full>
              <select value={buyerId} onChange={(e) => setBuyerId(Number(e.target.value) || "")} className="inp">
                <option value="">— Select buyer —</option>
                {buyers.map((p) => <option key={p.id} value={p.id}>{p.shortCode} · {p.name}</option>)}
              </select>
            </L>
            <L label={`Qty${selected ? ` (max ${fmtQty(selected.balance)})` : ""}`}>
              <input type="number" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} className="inp tabular text-right" />
            </L>
            <L label="Rate"><input type="number" value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} className="inp tabular text-right" /></L>
          </div>

          <div className="mt-4 space-y-1 rounded bg-muted/40 p-3 text-xs">
            <Row k="Gross" v={fmtINR(gross)} />
            <Row k="Buyer Expenses (+)" v={fmtINR(buyerExpTotal)} muted />
            <Row k="Grower Expenses (−)" v={fmtINR(growerExpTotal)} muted />
            <div className="mt-2 border-t border-border pt-2">
              <Row k="Buyer Dr" v={fmtINR(buyerNet)} bold />
              <Row k="Farmer Cr" v={fmtINR(growerNet)} bold />
            </div>
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save Sale
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid var(--input);background:var(--background);padding:6px 10px;font-size:13px;border-radius:4px}.inp:focus{outline:none;border-color:var(--ring);box-shadow:0 0 0 1px var(--ring)}`}</style>
    </>
  );
}

function L({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ k, v, muted, bold }: { k: string; v: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-semibold" : ""}`}>
      <span>{k}</span><span className="tabular">{v}</span>
    </div>
  );
}
