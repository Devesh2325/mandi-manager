import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR } from "@/lib/format";

export const Route = createFileRoute("/app/ledger")({
  component: LedgerPage,
});

function LedgerPage() {
  const { companyId, yearId, ready } = useScope();
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const ledger = useLiveQuery(async () => (ready ? await db.ledger.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const [partyId, setPartyId] = useState<number | "">("");

  const filtered = (partyId ? ledger.filter((l) => l.partyId === partyId) : ledger).slice().sort((a, b) => a.date.localeCompare(b.date));

  let runDr = 0, runCr = 0;
  const opening = partyId ? (parties.find((p) => p.id === partyId)?.openingBalance ?? 0) * (parties.find((p) => p.id === partyId)?.openingType === "Dr" ? 1 : -1) : 0;

  const totals = filtered.reduce((a, l) => ({ dr: a.dr + l.debit, cr: a.cr + l.credit }), { dr: 0, cr: 0 });
  const closing = opening + totals.dr - totals.cr;

  return (
    <>
      <TopBar title="Ledger" />
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <select value={partyId} onChange={(e) => setPartyId(Number(e.target.value) || "")} className="rounded border border-input bg-background px-2 py-1 text-xs">
            <option value="">— All parties —</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.shortCode} · {p.name}</option>)}
          </select>
          {partyId && (
            <div className="text-xs text-muted-foreground tabular">
              Opening: <span className={opening >= 0 ? "text-debit" : "text-credit"}>{fmtINR(Math.abs(opening))} {opening >= 0 ? "Dr" : "Cr"}</span>
              · Closing: <span className={closing >= 0 ? "text-debit" : "text-credit"}>{fmtINR(Math.abs(closing))} {closing >= 0 ? "Dr" : "Cr"}</span>
            </div>
          )}
        </div>
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead><tr><th>Date</th><th>Party</th><th>Narration</th><th>Type</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No ledger entries yet.</td></tr>}
              {filtered.map((l, i) => {
                runDr += l.debit; runCr += l.credit;
                const bal = opening + runDr - runCr;
                return (
                  <tr key={i}>
                    <td className="tabular">{l.date}</td>
                    <td>{parties.find((p) => p.id === l.partyId)?.name ?? "—"}</td>
                    <td className="text-muted-foreground">{l.narration}</td>
                    <td className="text-[10px] uppercase opacity-60">{l.refType}</td>
                    <td className="num tabular text-debit">{l.debit ? fmtINR(l.debit) : "—"}</td>
                    <td className="num tabular text-credit">{l.credit ? fmtINR(l.credit) : "—"}</td>
                    <td className={`num tabular font-semibold ${bal >= 0 ? "text-debit" : "text-credit"}`}>{fmtINR(Math.abs(bal))} {bal >= 0 ? "Dr" : "Cr"}</td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-muted">
                  <td colSpan={4} className="text-right font-semibold">Totals</td>
                  <td className="num tabular font-semibold">{fmtINR(totals.dr)}</td>
                  <td className="num tabular font-semibold">{fmtINR(totals.cr)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
