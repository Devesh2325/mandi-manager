import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  Package,
  BookOpen,
  Receipt,
  FileText,
  Users,
  Settings,
  LogOut,
  Building2,
  CalendarRange,
  ChevronRight,
} from "lucide-react";
import { useAppSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard, shortcut: "F1" },
    ],
  },
  {
    label: "Entry",
    items: [
      { label: "Main Challan Entry", to: "/app/entry/challan", icon: Truck, shortcut: "F2" },
      { label: "Voucher (Pay/Recv)", to: "/app/entry/voucher", icon: Receipt, shortcut: "F3" },
    ],
  },
  {
    label: "Stock & Sales",
    items: [
      { label: "Stock Register", to: "/app/stock", icon: Package },
      { label: "Teep (Sale Reg.)", to: "/app/teep", icon: FileText },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Ledger", to: "/app/ledger", icon: BookOpen },
      { label: "Cash Book", to: "/app/cashbook", icon: BookOpen },
      { label: "Trial Balance", to: "/app/trial-balance", icon: BookOpen },
    ],
  },
  {
    label: "Bills & Reports",
    items: [
      { label: "Bills", to: "/app/bills", icon: FileText },
      { label: "Reports", to: "/app/reports", icon: FileText },
    ],
  },
  {
    label: "Masters",
    items: [
      { label: "Parties", to: "/app/masters/parties", icon: Users },
      { label: "Items / Quality / Size", to: "/app/masters/items", icon: Package },
      { label: "Expenses & Packing", to: "/app/masters/expenses", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { company, year, session, logout } = useAppSession();
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">
          म
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Mandi ERP</div>
          <div className="text-[10px] uppercase tracking-wider opacity-70">Ledger Terminal</div>
        </div>
      </div>

      {/* Company / FY context */}
      <Link
        to="/select-context"
        className="block border-b border-sidebar-border bg-sidebar-accent/40 px-3 py-2 hover:bg-sidebar-accent"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-70">
          <Building2 className="h-3 w-3" /> Company
        </div>
        <div className="truncate text-sm font-medium">{company?.name ?? "—"}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-70">
          <CalendarRange className="h-3 w-3" /> FY
        </div>
        <div className="text-sm font-medium">{year?.label ?? "—"}</div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">
              {g.label}
            </div>
            {g.items.map((item) => {
              const active =
                item.to === "/app" ? path === "/app" : path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-primary/15 text-primary border-l-2 border-primary pl-[10px]"
                      : "hover:bg-sidebar-accent",
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.shortcut ? (
                    <span className="rounded border border-sidebar-border px-1 text-[9px] opacity-60">
                      {item.shortcut}
                    </span>
                  ) : (
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="leading-tight">
            <div className="text-xs font-medium">{session?.name}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">{session?.role}</div>
          </div>
          <button
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-sidebar-accent"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
