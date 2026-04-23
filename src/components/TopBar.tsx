import { useEffect, useState } from "react";
import { todayISO } from "@/lib/format";
import { Search, Bell, Sun, Moon } from "lucide-react";

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
    <header className="flex h-16 shrink-0 items-center justify-between px-6 pt-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        <div className="pebble-sm hidden items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          <input
            placeholder="Quick search… (Ctrl+K)"
            className="w-56 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {right}
        <div className="pebble-sm hidden items-center gap-2 rounded-full px-4 py-1.5 text-xs md:flex">
          <span className="text-muted-foreground">Date</span>
          <span className="font-semibold tabular">{todayISO()}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-muted-foreground">Time</span>
          <span className="font-semibold tabular" suppressHydrationWarning>
            {time ? time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="pebble-sm flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="pebble-sm flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
