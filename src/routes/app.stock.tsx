import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtQty } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/app/stock")({
  component: StockPage,
});

function StockPage() {
  const { companyId, yearId, ready } = useScope();
  const stock = useLiveQuery(async () => (ready ? await db.stockEntries.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  // Group by item + quality
  const map = new Map<string, { itemId: number; qualityId?: number; qtyIn: number; qtyOut: number }>();
  stock.forEach((s) => {
    const k = `${s.itemId}-${s.qualityId ?? 0}`;
    const cur = map.get(k) ?? { itemId: s.itemId, qualityId: s.qualityId, qtyIn: 0, qtyOut: 0 };
    cur.qtyIn += s.qtyIn;
    cur.qtyOut += s.qtyOut;
    map.set(k, cur);
  });
  const rows = Array.from(map.values());

  return (
    <>
      <TopBar title="Stock Register" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Showing remaining stock balances grouped by item & quality.</div>
          <Link to="/app/stock/sale" className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
            <Receipt className="h-3.5 w-3.5" /> Sell Remaining Stock
          </Link>
        </div>
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead><tr><th>Item</th><th>Quality</th><th className="num">Qty In</th><th className="num">Qty Out</th><th className="num">Balance</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No stock yet. Save a Challan to populate stock.</td></tr>}
              {rows.map((r, i) => {
                const item = items.find((x) => x.id === r.itemId);
                const q = qualities.find((x) => x.id === r.qualityId);
                const bal = r.qtyIn - r.qtyOut;
                return (
                  <tr key={i}>
                    <td className="font-medium">{item?.name ?? "—"}</td>
                    <td>{q?.name ?? "—"}</td>
                    <td className="num tabular">{fmtQty(r.qtyIn)}</td>
                    <td className="num tabular">{fmtQty(r.qtyOut)}</td>
                    <td className={`num tabular font-semibold ${bal > 0 ? "text-credit" : "text-muted-foreground"}`}>{fmtQty(bal)}</td>
                    <td>
                      {bal > 0 && (
                        <Link to="/app/stock/sale" className="text-xs font-semibold text-primary hover:underline">Sell →</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
