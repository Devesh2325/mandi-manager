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
  Shield,
} from "lucide-react";
import { useAppSession } from "@/lib/session-context";
import { useTenant } from "@/lib/tenant-context";
import { can } from "@/lib/db";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  /** Permission gate. When omitted, item is shown to all authenticated users. */
  requires?: "settings" | "manageUsers" | "manageMasters" | "entry" | "voucher" | "reports";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", to: "/app", icon: LayoutDashboard, shortcut: "F1" }],
  },
  {
    label: "Entry",
    items: [
      { label: "Challan Entry", to: "/app/entry/challan", icon: Truck, shortcut: "F2", requires: "entry" },
      { label: "Stock Sale", to: "/app/stock/sale", icon: Receipt, shortcut: "F4", requires: "entry" },
      { label: "Voucher (Pay/Recv)", to: "/app/entry/voucher", icon: Receipt, shortcut: "F3", requires: "voucher" },
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
      { label: "Parties", to: "/app/masters/parties", icon: Users, requires: "manageMasters" },
      { label: "Items / Quality / Size", to: "/app/masters/items", icon: Package, requires: "manageMasters" },
      { label: "Expenses & Packing", to: "/app/masters/expenses", icon: Settings, requires: "manageMasters" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Settings & Users", to: "/app/settings", icon: Settings, requires: "settings" },
    ],
  },
];

export function AppSidebar() {
  const { company, year, session, logout } = useAppSession();
  const { isSuperAdmin, activeTenant, impersonating } = useTenant();
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside id="tour-sidebar" data-tour="sidebar" className="flex h-screen w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground p-4 gap-4">
      {/* Brand */}
      <div id="tour-brand" data-tour="brand" className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-light to-primary text-primary-foreground font-bold shadow-pebble-sm">
          म
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight">
            Mandi<span className="text-primary">ERP</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Trade Suite
          </div>
        </div>
      </div>

      {/* Company / FY context */}
      <Link
        to="/select-context"
        id="tour-context-switcher"
        data-tour="context-switcher"
        className="pebble-sm block px-4 py-3 hover:shadow-pebble transition-shadow"
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3 w-3" /> Company
        </div>
        <div className="truncate text-sm font-semibold mt-0.5">{company?.name ?? "—"}</div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <CalendarRange className="h-3 w-3" /> FY
        </div>
        <div className="text-sm font-semibold">{year?.label ?? "—"}</div>
      </Link>

      {/* Cloud tenant + super admin */}
      {(isSuperAdmin || activeTenant) && (
        <div className="pebble-sm flex flex-col gap-1 px-3 py-2 text-xs">
          {activeTenant && (
            <div className="truncate">
              <span className="text-muted-foreground">Tenant: </span>
              <span className="font-semibold">{activeTenant.company_name}</span>
              {impersonating && (
                <span className="ml-1 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] uppercase text-amber-700">
                  impersonating
                </span>
              )}
            </div>
          )}
          {isSuperAdmin && (
            <Link
              to="/super-admin"
              className="inline-flex items-center gap-1.5 self-start rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
            >
              <Shield className="h-3 w-3" /> Super Admin
            </Link>
          )}
        </div>
      )}

      {/* Nav */}
      <nav id="tour-nav" data-tour="nav" className="flex-1 overflow-y-auto -mx-1 px-1">
        {groups.map((g) => {
          const visibleItems = g.items.filter((i) => !i.requires || can(session?.role, i.requires));
          if (visibleItems.length === 0) return null;
          return (
          <div key={g.label} data-tour-group={g.label.toLowerCase().replace(/\s+/g, "-")} className="mb-4">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const active =
                  item.to === "/app" ? path === "/app" : path.startsWith(item.to);
                const Icon = item.icon;
                const tourId = "tour-nav-" + item.to.replace(/^\//, "").replace(/\//g, "-");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    id={tourId}
                    data-tour={tourId}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-card text-primary shadow-pebble-sm"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.shortcut && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {item.shortcut}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* User */}
      <div id="tour-user" data-tour="user" className="pebble-sm flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-primary text-xs font-bold">
            {session?.name?.slice(0, 2).toUpperCase() ?? "U"}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-xs font-semibold truncate">{session?.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {session?.role}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          id="tour-logout"
          data-tour="logout"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
