import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/app/masters")({
  component: MastersLayout,
});

const tabs = [
  { to: "/app/masters/parties", label: "Parties" },
  { to: "/app/masters/items", label: "Items / Quality / Size" },
  { to: "/app/masters/expenses", label: "Expenses & Packing" },
];

function MastersLayout() {
  const loc = useLocation();
  return (
    <>
      <TopBar title="Masters" />
      <div className="border-b border-border bg-card px-4">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </>
  );
}
