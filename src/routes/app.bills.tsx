import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR, fmtQty } from "@/lib/format";
import { FileText, Printer } from "lucide-react";

export const Route = createFileRoute("/app/bills")({
  component: BillsPage,
});

function BillsPage() {
  const { companyId, yearId, ready } = useScope();
  const teeps = useLiveQuery(async () => (ready ? await db.teeps.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const challans = useLiveQuery(async () => (ready ? await db.challans.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  // Group teeps by buyer (Buyer Purcha) and challan farmer (Grower Sale Bill)
  const buyerGroups = new Map<number, typeof teeps>();
  teeps.forEach((t) => {
    const arr = buyerGroups.get(t.buyerId) ?? [];
    arr.push(t);
    buyerGroups.set(t.buyerId, arr);
  });

  const farmerGroups = new Map<number, typeof teeps>();
  teeps.forEach((t) => {
    const ch = challans.find((c) => c.id === t.challanId);
    if (!ch) return;
    const arr = farmerGroups.get(ch.farmerId) ?? [];
    arr.push(t);
    farmerGroups.set(ch.farmerId, arr);
  });

  return (
    <>
      <TopBar title="Bills" />
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Buyer Purcha (Bills)</div>
          <table className="grid-table">
            <thead><tr><th>Buyer</th><th className="num">Lines</th><th className="num">Qty</th><th className="num">Gross</th><th></th></tr></thead>
            <tbody>
              {Array.from(buyerGroups.entries()).map(([bid, list]) => {
                const p = parties.find((x) => x.id === bid);
                const qty = list.reduce((a, b) => a + b.qty, 0);
                const gross = list.reduce((a, b) => a + b.gross, 0);
                return (
                  <tr key={bid}>
                    <td className="font-medium">{p?.name ?? "—"}</td>
                    <td className="num tabular">{list.length}</td>
                    <td className="num tabular">{fmtQty(qty)}</td>
                    <td className="num tabular font-semibold">{fmtINR(gross)}</td>
                    <td><Link to="/app/teep" className="inline-flex items-center gap-1 text-primary hover:underline"><FileText className="h-3 w-3" /> View</Link></td>
                  </tr>
                );
              })}
              {buyerGroups.size === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No bills yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="rounded border border-border bg-card">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grower Sale Bills</div>
          <table className="grid-table">
            <thead><tr><th>Farmer</th><th className="num">Lines</th><th className="num">Qty</th><th className="num">Net</th><th></th></tr></thead>
            <tbody>
              {Array.from(farmerGroups.entries()).map(([fid, list]) => {
                const p = parties.find((x) => x.id === fid);
                const qty = list.reduce((a, b) => a + b.qty, 0);
                const net = list.reduce((a, b) => a + b.net, 0);
                return (
                  <tr key={fid}>
                    <td className="font-medium">{p?.name ?? "—"}</td>
                    <td className="num tabular">{list.length}</td>
                    <td className="num tabular">{fmtQty(qty)}</td>
                    <td className="num tabular font-semibold text-credit">{fmtINR(net)}</td>
                    <td><button onClick={() => window.print()} className="inline-flex items-center gap-1 text-primary hover:underline"><Printer className="h-3 w-3" /> Print</button></td>
                  </tr>
                );
              })}
              {farmerGroups.size === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No bills yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
