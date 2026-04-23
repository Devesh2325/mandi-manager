import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { fmtINR, fmtQty } from "@/lib/format";
import { Truck, Package, IndianRupee, Users, FileText, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { companyId, yearId, ready } = useScope();

  const challans = useLiveQuery(
    async () => (ready ? await db.challans.where({ companyId, yearId }).toArray() : []),
    [companyId, yearId, ready],
  ) ?? [];
  const teeps = useLiveQuery(
    async () => (ready ? await db.teeps.where({ companyId, yearId }).toArray() : []),
    [companyId, yearId, ready],
  ) ?? [];
  const parties = useLiveQuery(
    async () => (ready ? await db.parties.where({ companyId, yearId }).toArray() : []),
    [companyId, yearId, ready],
  ) ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const todayChallans = challans.filter((c) => c.date === today);
  const todayTeeps = teeps.filter((t) => t.date === today);
  const todayQty = todayChallans.reduce((s, c) => s + c.totalQty, 0);
  const todaySales = todayTeeps.reduce((s, t) => s + t.gross, 0);
  const todayNet = todayTeeps.reduce((s, t) => s + t.net, 0);

  const farmers = parties.filter((p) => p.type === "farmer").length;
  const buyers = parties.filter((p) => p.type === "buyer").length;

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI icon={Truck} label="Today's Arrivals" value={`${todayChallans.length}`} sub={`${fmtQty(todayQty)} qty`} accent="primary" />
          <KPI icon={FileText} label="Today's Teeps" value={`${todayTeeps.length}`} sub={`${fmtINR(todaySales)} gross`} accent="chart-2" />
          <KPI icon={IndianRupee} label="Net Sale Today" value={fmtINR(todayNet)} sub="after expenses" accent="chart-1" />
          <KPI icon={Users} label="Parties" value={`${parties.length}`} sub={`${farmers} farmer · ${buyers} buyer`} accent="chart-4" />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Challans</div>
              <Link to="/app/entry/challan" className="text-xs text-primary hover:underline">+ New Challan</Link>
            </div>
            {challans.length === 0 ? (
              <Empty msg="No challans yet. Press F2 or click '+ New Challan' to begin." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr><th>Date</th><th>Challan #</th><th>Farmer</th><th>Item</th><th className="num">Qty</th><th>Truck</th></tr>
                </thead>
                <tbody>
                  {challans.slice(-10).reverse().map((c) => (
                    <tr key={c.id}>
                      <td className="tabular">{c.date}</td>
                      <td className="font-medium">{c.challanNo}</td>
                      <td>{parties.find((p) => p.id === c.farmerId)?.name ?? "—"}</td>
                      <td>—</td>
                      <td className="num">{fmtQty(c.totalQty)}</td>
                      <td>{c.truckNo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded border border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </div>
            <div className="space-y-1 p-2">
              <QuickLink to="/app/entry/challan" icon={Truck} label="New Challan Entry" hint="F2" />
              <QuickLink to="/app/entry/voucher" icon={IndianRupee} label="Payment / Receipt" hint="F3" />
              <QuickLink to="/app/masters/parties" icon={Users} label="Add Party" hint="" />
              <QuickLink to="/app/teep" icon={FileText} label="View Teep Register" hint="" />
              <QuickLink to="/app/stock" icon={Package} label="Stock Register" hint="" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KPI({
  icon: Icon, label, value, sub, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded bg-${accent}/15 text-${accent === "primary" ? "primary" : "foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, hint }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted">
      <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
      {hint && <span className="rounded border border-input px-1 text-[10px] text-muted-foreground">{hint}</span>}
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-3 py-10 text-center text-xs text-muted-foreground">{msg}</div>;
}
