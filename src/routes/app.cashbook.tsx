import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { fmtINR } from "@/lib/format";

export const Route = createFileRoute("/app/cashbook")({
  component: CashBookPage,
});

function CashBookPage() {
  const { companyId, yearId, ready } = useScope();
  const vouchers = useLiveQuery(async () => (ready ? await db.vouchers.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];
  const totals = vouchers.reduce((a, v) => v.type === "receipt" ? { ...a, recv: a.recv + v.amount } : v.type === "payment" ? { ...a, pay: a.pay + v.amount } : a, { recv: 0, pay: 0 });
  return (
    <>
      <TopBar title="Cash Book" />
      <div className="p-4">
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Box label="Receipts" value={fmtINR(totals.recv)} accent="credit" />
          <Box label="Payments" value={fmtINR(totals.pay)} accent="debit" />
          <Box label="Cash Balance" value={fmtINR(totals.recv - totals.pay)} accent={totals.recv - totals.pay >= 0 ? "credit" : "debit"} />
        </div>
        <div className="overflow-auto rounded border border-border bg-card">
          <table className="grid-table">
            <thead><tr><th>Date</th><th>Voucher</th><th>Party</th><th>Type</th><th>Narration</th><th className="num">Receipt</th><th className="num">Payment</th></tr></thead>
            <tbody>
              {vouchers.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No cash entries yet.</td></tr>}
              {vouchers.slice().reverse().map((v) => (
                <tr key={v.id}>
                  <td className="tabular">{v.date}</td>
                  <td className="font-mono">{v.voucherNo}</td>
                  <td>{parties.find((p) => p.id === v.partyId)?.name ?? "—"}</td>
                  <td className="text-[10px] uppercase">{v.type}</td>
                  <td className="text-muted-foreground">{v.narration ?? "—"}</td>
                  <td className="num tabular text-credit">{v.type === "receipt" ? fmtINR(v.amount) : "—"}</td>
                  <td className="num tabular text-debit">{v.type === "payment" ? fmtINR(v.amount) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Box({ label, value, accent }: { label: string; value: string; accent: "credit" | "debit" }) {
  return (
    <div className="rounded border border-border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular ${accent === "credit" ? "text-credit" : "text-debit"}`}>{value}</div>
    </div>
  );
}
