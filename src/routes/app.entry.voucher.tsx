import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db, type VoucherType } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { TopBar } from "@/components/TopBar";
import { todayISO, fmtINR } from "@/lib/format";
import { Save } from "lucide-react";

export const Route = createFileRoute("/app/entry/voucher")({
  component: VoucherPage,
});

function VoucherPage() {
  const { companyId, yearId, ready } = useScope();
  const navigate = useNavigate();
  const parties = useLiveQuery(async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []), [companyId, yearId, ready]) ?? [];

  const [type, setType] = useState<VoucherType>("payment");
  const [date, setDate] = useState(todayISO());
  const [partyId, setPartyId] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(0);
  const [narration, setNarration] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  useEffect(() => {
    (async () => {
      const c = await db.vouchers.where({ companyId, yearId }).count();
      const prefix = type === "payment" ? "PV" : type === "receipt" ? "RV" : "JV";
      setVoucherNo(`${prefix}-${(c + 1).toString().padStart(4, "0")}`);
    })();
  }, [companyId, yearId, type]);

  const save = async () => {
    if (!partyId || amount <= 0) return;
    const id = await db.vouchers.add({
      companyId, yearId, type, voucherNo, date,
      partyId: Number(partyId), amount, narration,
    });
    // Ledger: payment = Cr cash / Dr party (we treat as Dr/Cr to party)
    const isReceipt = type === "receipt";
    await db.ledger.add({
      companyId, yearId, date,
      partyId: Number(partyId),
      refType: "voucher", refId: id as number,
      narration: `${type.toUpperCase()} ${voucherNo}${narration ? ` — ${narration}` : ""}`,
      debit: isReceipt ? 0 : amount,
      credit: isReceipt ? amount : 0,
    });
    navigate({ to: "/app/ledger" });
  };

  return (
    <>
      <TopBar title="Voucher Entry" />
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded border border-border bg-card p-4">
          <div className="mb-4 flex gap-2">
            {(["payment", "receipt", "journal"] as VoucherType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded px-3 py-1.5 text-xs font-semibold uppercase ${type === t ? "bg-primary text-primary-foreground" : "border border-input hover:bg-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Voucher #"><input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} className="inp font-mono" /></L>
            <L label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="inp" /></L>
            <L label="Party" full>
              <select value={partyId} onChange={(e) => setPartyId(Number(e.target.value) || "")} className="inp">
                <option value="">— Select party —</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.shortCode} · {p.name} ({p.type})</option>)}
              </select>
            </L>
            <L label="Amount" full><input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="inp tabular text-right text-lg" /></L>
            <L label="Narration" full><textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} className="inp" /></L>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Posting: {type === "payment" ? "Dr Party / Cr Cash" : type === "receipt" ? "Dr Cash / Cr Party" : "Manual journal"} · {fmtINR(amount)}</div>
            <button onClick={save} disabled={!partyId || amount <= 0} className="inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save</button>
          </div>
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
