import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { FileText, BarChart3, Truck, Users, Building2, Package } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

const reports = [
  { label: "Teep / Sale Register", to: "/app/teep", icon: FileText, desc: "Qty, rate, gross, expense, net per buyer line." },
  { label: "Buyer Summary", to: "/app/bills", icon: Users, desc: "Date-wise buyer totals." },
  { label: "Grower Sale Bill", to: "/app/bills", icon: FileText, desc: "Item-wise breakdown, expenses, net sale." },
  { label: "Cash Book", to: "/app/cashbook", icon: BarChart3, desc: "Daily receipts/payments." },
  { label: "Trial Balance", to: "/app/trial-balance", icon: BarChart3, desc: "All party balances Dr/Cr." },
  { label: "Stock Report", to: "/app/stock", icon: Package, desc: "Item × Quality balance." },
  { label: "APMC Report", to: "/app/teep", icon: Building2, desc: "APMC cess collected (per Teep)." },
  { label: "Truck-wise Report", to: "/app/entry/challan", icon: Truck, desc: "Arrivals grouped by truck no." },
];

function ReportsPage() {
  return (
    <>
      <TopBar title="Reports" />
      <div className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.label} to={r.to} className="group rounded border border-border bg-card p-3 hover:border-primary hover:bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{r.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-6 rounded border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
          More reports (Buyer Purcha PDF, Area-wise, Store, Outstanding Aging, Agent commission) will be added in the next iteration.
          The data layer already captures everything needed — these are presentation-only.
        </div>
      </div>
    </>
  );
}
