import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtQty } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/app/stock/")({
  component: StockPage,
});

function StockPage() {
  const { companyId, yearId, ready } = useScope();
  const stock = useLiveQuery(async () => (ready ? await db.stockEntries.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const challans = useLiveQuery(async () => (ready ? await db.challans.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  // Group by challan + item + quality so Sell can open the exact lot
  const map = new Map<string, {
    key: string;
    challanId: number;
    challanNo: string;
    farmerId: number;
    date: string;
    itemId: number;
    qualityId?: number;
    qtyIn: number;
    qtyOut: number;
  }>();
  stock.forEach((s) => {
    const challan = challans.find((c) => c.id === s.challanId);
    const k = `${s.challanId}-${s.itemId}-${s.qualityId ?? 0}`;
    const cur = map.get(k) ?? {
      key: k,
      challanId: s.challanId,
      challanNo: challan?.challanNo ?? `#${s.challanId}`,
      farmerId: challan?.farmerId ?? 0,
      date: challan?.date ?? s.date,
      itemId: s.itemId,
      qualityId: s.qualityId,
      qtyIn: 0,
      qtyOut: 0,
    };
    cur.qtyIn += s.qtyIn;
    cur.qtyOut += s.qtyOut;
    map.set(k, cur);
  });
  const rows = Array.from(map.values()).filter((row) => row.qtyIn - row.qtyOut > 0);

  const pdfRows = rows.map((r) => [
    r.date, r.challanNo,
    parties.find((x) => x.id === r.farmerId)?.name ?? "—",
    items.find((x) => x.id === r.itemId)?.name ?? "—",
    qualities.find((x) => x.id === r.qualityId)?.name ?? "—",
    fmtQty(r.qtyIn), fmtQty(r.qtyOut), fmtQty(r.qtyIn - r.qtyOut),
  ]);

  return (
    <>
      <TopBar
        title="Stock Register"
        right={
          <PdfActions
            title="Stock Register"
            filename="stock-register"
            orientation="l"
            columns={[
              { header: "Date" }, { header: "Challan" }, { header: "Farmer" }, { header: "Item" }, { header: "Quality" },
              { header: "Qty In", num: true }, { header: "Qty Out", num: true }, { header: "Balance", num: true },
            ]}
            rows={pdfRows}
          />
        }
      />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Showing remaining stock balances lot-wise for quick sale.</div>
          <Link to="/app/stock/sale" search={{ lot: undefined }} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
            <Receipt className="h-3.5 w-3.5" /> Sell Remaining Stock
          </Link>
        </div>
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead><tr><th>Date</th><th>Challan</th><th>Farmer</th><th>Item</th><th>Quality</th><th className="num">Qty In</th><th className="num">Qty Out</th><th className="num">Balance</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No stock yet. Save a Challan to populate stock.</td></tr>}
              {rows.map((r, i) => {
                const item = items.find((x) => x.id === r.itemId);
                const q = qualities.find((x) => x.id === r.qualityId);
                const farmer = parties.find((x) => x.id === r.farmerId);
                const bal = r.qtyIn - r.qtyOut;
                return (
                  <tr key={i}>
                    <td className="tabular">{r.date}</td>
                    <td className="font-mono">{r.challanNo}</td>
                    <td>{farmer?.name ?? "—"}</td>
                    <td className="font-medium">{item?.name ?? "—"}</td>
                    <td>{q?.name ?? "—"}</td>
                    <td className="num tabular">{fmtQty(r.qtyIn)}</td>
                    <td className="num tabular">{fmtQty(r.qtyOut)}</td>
                    <td className={`num tabular font-semibold ${bal > 0 ? "text-credit" : "text-muted-foreground"}`}>{fmtQty(bal)}</td>
                    <td>
                      {bal > 0 && (
                        <Link to="/app/stock/sale" search={{ lot: r.key }} className="text-xs font-semibold text-primary hover:underline">Sell →</Link>
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
