import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { PdfActions } from "@/components/PdfActions";
import { fmtINR } from "@/lib/format";

export const Route = createFileRoute("/app/trial-balance")({
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const { companyId, yearId, ready } = useScope();
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const ledger = useLiveQuery(async () => (ready ? await db.ledger.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const rows = parties.map((p) => {
    const opening = (p.openingBalance ?? 0) * (p.openingType === "Dr" ? 1 : -1);
    const dr = ledger.filter((l) => l.partyId === p.id).reduce((a, l) => a + l.debit, 0);
    const cr = ledger.filter((l) => l.partyId === p.id).reduce((a, l) => a + l.credit, 0);
    const bal = opening + dr - cr;
    return { p, dr, cr, bal };
  });

  const totDr = rows.reduce((a, r) => a + (r.bal > 0 ? r.bal : 0), 0);
  const totCr = rows.reduce((a, r) => a + (r.bal < 0 ? -r.bal : 0), 0);

  const pdfRows = rows.map((r) => [
    r.p.name, r.p.type.toUpperCase(),
    r.bal > 0 ? fmtINR(r.bal) : "—",
    r.bal < 0 ? fmtINR(-r.bal) : "—",
  ]);

  return (
    <>
      <TopBar
        title="Trial Balance"
        right={
          <PdfActions
            title="Trial Balance"
            filename="trial-balance"
            subtitle={totDr === totCr ? "✓ Balanced" : `Difference: ${fmtINR(Math.abs(totDr - totCr))}`}
            columns={[{ header: "Party" }, { header: "Type" }, { header: "Debit", num: true }, { header: "Credit", num: true }]}
            rows={pdfRows}
            footer={["Totals", "", fmtINR(totDr), fmtINR(totCr)]}
          />
        }
      />
      <div className="p-4">
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead><tr><th>Party</th><th>Type</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td className="font-medium">{r.p.name}</td>
                  <td className="text-[10px] uppercase opacity-70">{r.p.type}</td>
                  <td className="num tabular text-debit">{r.bal > 0 ? fmtINR(r.bal) : "—"}</td>
                  <td className="num tabular text-credit">{r.bal < 0 ? fmtINR(-r.bal) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted">
                <td colSpan={2} className="text-right font-semibold">Totals</td>
                <td className="num tabular font-semibold">{fmtINR(totDr)}</td>
                <td className="num tabular font-semibold">{fmtINR(totCr)}</td>
              </tr>
              <tr className={totDr === totCr ? "bg-credit/10" : "bg-destructive/10"}>
                <td colSpan={4} className="text-center text-xs font-semibold">
                  {totDr === totCr ? "✓ Trial Balance is balanced" : `⚠ Difference: ${fmtINR(Math.abs(totDr - totCr))}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
