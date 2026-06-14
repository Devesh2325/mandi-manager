import { useEffect, useState } from "react";
import { todayISO } from "@/lib/format";
import { Search, Bell, Sun, Moon, HelpCircle } from "lucide-react";
import { CloudSyncIndicator } from "./CloudSyncIndicator";

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const [time, setTime] = useState<Date | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header id="tour-topbar" data-tour="topbar" className="flex h-16 shrink-0 items-center justify-between px-6 pt-4">
      <div className="flex items-center gap-4">
        <h1 id="tour-page-title" data-tour="page-title" className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        <button
          id="tour-search"
          data-tour="search"
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
            window.dispatchEvent(ev);
          }}
          className="pebble-sm hidden items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex"
          title="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="w-56 text-left">Quick search… (Ctrl+K)</span>
        </button>
      </div>
      <div id="tour-topbar-actions" data-tour="topbar-actions" className="flex items-center gap-3">
        {right}
        <CloudSyncIndicator />
        <div id="tour-clock" data-tour="clock" className="pebble-sm hidden items-center gap-2 rounded-full px-4 py-1.5 text-xs md:flex">
          <span className="text-muted-foreground">Date</span>
          <span className="font-semibold tabular">{todayISO()}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-muted-foreground">Time</span>
          <span className="font-semibold tabular" suppressHydrationWarning>
            {time ? time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event("open-shortcuts"))}
          className="pebble-sm flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          title="Keyboard shortcuts (press ?)"
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          id="tour-theme-toggle"
          data-tour="theme-toggle"
          className="pebble-sm flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          id="tour-notifications"
          data-tour="notifications"
          className="pebble-sm flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
