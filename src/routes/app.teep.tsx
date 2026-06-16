import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { PdfActions } from "@/components/PdfActions";
import { EmptyState } from "@/components/EmptyState";
import { FileText } from "lucide-react";
import { fmtINR, fmtQty } from "@/lib/format";

export const Route = createFileRoute("/app/teep")({
  component: TeepPage,
});

function TeepPage() {
  const { companyId, yearId, ready } = useScope();
  const teeps = useLiveQuery(async () => (ready ? await db.teeps.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const items = useLiveQuery(async () => (ready ? await db.items.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const qualities = useLiveQuery(async () => (ready ? await db.qualities.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const totals = teeps.reduce((acc, t) => ({ qty: acc.qty + t.qty, gross: acc.gross + t.gross, net: acc.net + t.net }), { qty: 0, gross: 0, net: 0 });

  const pdfRows = teeps.slice().reverse().map((t) => {
    const exp = t.expenses.reduce((a, b) => a + b.amount, 0);
    return [
      t.date,
      t.teepNo,
      parties.find((p) => p.id === t.buyerId)?.name ?? "—",
      items.find((i) => i.id === t.itemId)?.name ?? "—",
      qualities.find((q) => q.id === t.qualityId)?.name ?? "—",
      fmtQty(t.qty),
      fmtINR(t.rate),
      fmtINR(t.gross),
      fmtINR(exp),
      fmtINR(t.net),
    ];
  });

  return (
    <>
      <TopBar
        title="Teep — Sale Register"
        right={
          <PdfActions
            title="Teep — Sale Register"
            filename="teep-sale-register"
            orientation="l"
            columns={[
              { header: "Date" }, { header: "Teep #" }, { header: "Buyer" },
              { header: "Item" }, { header: "Quality" },
              { header: "Qty", num: true }, { header: "Rate", num: true },
              { header: "Gross", num: true }, { header: "Expense", num: true }, { header: "Net", num: true },
            ]}
            rows={pdfRows}
            footer={["", "", "", "", "Totals", fmtQty(totals.qty), "", fmtINR(totals.gross), "", fmtINR(totals.net)]}
          />
        }
      />
      <div className="p-4">
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead>
              <tr><th>Date</th><th>Teep #</th><th>Buyer</th><th>Item</th><th>Quality</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Gross</th><th className="num">Expense</th><th className="num">Net</th></tr>
            </thead>
            <tbody>
              {teeps.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">No teeps yet.</td></tr>}
              {teeps.slice().reverse().map((t) => {
                const exp = t.expenses.reduce((a, b) => a + b.amount, 0);
                return (
                  <tr key={t.id}>
                    <td className="tabular">{t.date}</td>
                    <td className="font-mono font-medium">{t.teepNo}</td>
                    <td>{parties.find((p) => p.id === t.buyerId)?.name ?? "—"}</td>
                    <td>{items.find((i) => i.id === t.itemId)?.name ?? "—"}</td>
                    <td>{qualities.find((q) => q.id === t.qualityId)?.name ?? "—"}</td>
                    <td className="num tabular">{fmtQty(t.qty)}</td>
                    <td className="num tabular">{fmtINR(t.rate)}</td>
                    <td className="num tabular">{fmtINR(t.gross)}</td>
                    <td className="num tabular text-debit">{fmtINR(exp)}</td>
                    <td className="num tabular font-semibold text-credit">{fmtINR(t.net)}</td>
                  </tr>
                );
              })}
            </tbody>
            {teeps.length > 0 && (
              <tfoot>
                <tr className="bg-muted">
                  <td colSpan={5} className="text-right font-semibold">Totals</td>
                  <td className="num tabular font-semibold">{fmtQty(totals.qty)}</td>
                  <td></td>
                  <td className="num tabular font-semibold">{fmtINR(totals.gross)}</td>
                  <td></td>
                  <td className="num tabular font-semibold text-credit">{fmtINR(totals.net)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
