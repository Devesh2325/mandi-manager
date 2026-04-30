import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppSession } from "@/lib/session-context";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAppSession();
  const navigate = useNavigate();
  const [u, setU] = useState("admin");
  const [p, setP] = useState("admin");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const ok = await login(u, p);
    setBusy(false);
    if (ok) navigate({ to: "/select-context" });
    else setErr("Invalid credentials. Try admin / admin");
  };

  return (
    <div className="flex min-h-screen items-stretch bg-background">
      {/* Left: brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground text-xl font-bold">
            म
          </div>
          <div>
            <div className="text-lg font-semibold">Mandi ERP</div>
            <div className="text-xs uppercase tracking-widest opacity-70">Ledger Terminal v1</div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Arrival → Sale → Teep → Ledger → Bill.
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-80">
            Built for the speed of Azadpur. Keyboard-first, Excel-grid entry,
            multi-quality multi-buyer, auto APMC & dalali, full ledger.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            {[
              ["F2", "New Challan"],
              ["F3", "Voucher"],
              ["F8", "Reports"],
              ["Ctrl+S", "Save"],
              ["Ctrl+N", "New Row"],
              ["Esc", "Cancel"],
            ].map(([k, l]) => (
              <div key={k} className="rounded border border-sidebar-border bg-sidebar-accent/30 p-2">
                <div className="font-mono text-[11px] text-primary">{k}</div>
                <div className="opacity-80">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] opacity-50">© Mandi ERP — APMC commission-agent workflow</div>
      </div>

      {/* Right: form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use <span className="font-mono">admin / admin</span> or{" "}
            <span className="font-mono">munim / munim</span>
          </p>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Username
          </label>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            autoFocus
          />

          <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />

          {err && <div className="mt-3 text-xs text-destructive">{err}</div>}

          <button
            disabled={busy}
            className="mt-6 w-full rounded bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            New here?{" "}
            <a href="/auth" className="font-semibold text-primary hover:underline">
              Create cloud account / tenant →
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
