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
      <div id="tour-dashboard" data-tour="dashboard" className="flex-1 overflow-auto p-6 space-y-6">
        <div id="tour-kpis" data-tour="kpis" className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <KPI tourId="tour-kpi-arrivals" icon={Truck} label="Today's Arrivals" value={`${todayChallans.length}`} sub={`${fmtQty(todayQty)} qty`} />
          <KPI tourId="tour-kpi-teeps" icon={FileText} label="Today's Teeps" value={`${todayTeeps.length}`} sub={`${fmtINR(todaySales)} gross`} />
          <KPI tourId="tour-kpi-net-sale" icon={IndianRupee} label="Net Sale Today" value={fmtINR(todayNet)} sub="after expenses" />
          <KPI tourId="tour-kpi-parties" icon={Users} label="Parties" value={`${parties.length}`} sub={`${farmers} farmer · ${buyers} buyer`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div id="tour-recent-challans" data-tour="recent-challans" className="pebble lg:col-span-2 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Recent Challans</h2>
              <Link to="/app/entry/challan" id="tour-new-challan-link" data-tour="new-challan-link" className="text-sm font-semibold text-primary hover:underline">
                + New Challan
              </Link>
            </div>
            {challans.length === 0 ? (
              <Empty msg="No challans yet. Press F2 or click '+ New Challan' to begin." />
            ) : (
              <table id="tour-recent-challans-table" data-tour="recent-challans-table" className="grid-table">
                <thead>
                  <tr><th>Date</th><th>Challan #</th><th>Farmer</th><th>Item</th><th className="num">Qty</th><th>Truck</th></tr>
                </thead>
                <tbody>
                  {challans.slice(-10).reverse().map((c) => (
                    <tr key={c.id}>
                      <td className="tabular">{c.date}</td>
                      <td className="font-semibold">{c.challanNo}</td>
                      <td>{parties.find((p) => p.id === c.farmerId)?.name ?? "—"}</td>
                      <td>—</td>
                      <td className="num font-semibold">{fmtQty(c.totalQty)}</td>
                      <td className="text-muted-foreground">{c.truckNo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div id="tour-quick-actions" data-tour="quick-actions" className="pebble p-6">
            <h2 className="text-base font-bold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-1.5">
              <QuickLink tourId="tour-qa-challan" to="/app/entry/challan" icon={Truck} label="New Challan Entry" hint="F2" />
              <QuickLink tourId="tour-qa-voucher" to="/app/entry/voucher" icon={IndianRupee} label="Payment / Receipt" hint="F3" />
              <QuickLink tourId="tour-qa-party" to="/app/masters/parties" icon={Users} label="Add Party" hint="" />
              <QuickLink tourId="tour-qa-teep" to="/app/teep" icon={FileText} label="View Teep Register" hint="" />
              <QuickLink tourId="tour-qa-stock" to="/app/stock" icon={Package} label="Stock Register" hint="" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KPI({
  icon: Icon, label, value, sub, tourId,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tourId?: string }) {
  return (
    <div id={tourId} data-tour={tourId} className="pebble p-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      <div className="absolute -right-8 -top-8 size-32 bg-brand-light/60 rounded-full blur-2xl group-hover:bg-brand-light transition-colors duration-500 -z-10" />
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, hint, tourId }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; hint: string; tourId?: string }) {
  return (
    <Link to={to} id={tourId} data-tour={tourId} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
      <span className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-primary" />{label}</span>
      {hint && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{hint}</span>}
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-3 py-10 text-center text-sm text-muted-foreground">{msg}</div>;
}
