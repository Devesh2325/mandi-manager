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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h1>
        <div className="hidden items-center gap-2 rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground md:flex">
          <Search className="h-3 w-3" />
          <input
            placeholder="Quick search… (Ctrl+K)"
            className="w-64 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {right}
        <div className="hidden text-xs tabular md:block">
          <span className="text-muted-foreground">Date </span>
          <span className="font-medium">{todayISO()}</span>
          <span className="ml-2 text-muted-foreground">Time </span>
          <span className="font-medium">
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
          title="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Notifications">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
