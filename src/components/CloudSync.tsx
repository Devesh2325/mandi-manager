/**
 * Cloud Sync UI: progress dialog + auto-detect prompt + manual button.
 *
 * Renders only when the user is cloud-authenticated AND has an active tenant.
 * Auto-detect: on first login (per user), if local IndexedDB has data and we
 * haven't synced yet, show a prompt offering Sync now / Skip / Later.
 */
import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import {
  hasLocalData,
  localDataSummary,
  syncLocalToCloud,
  markSyncDone,
  wasSyncDone,
  clearSyncDone,
  type SyncProgress,
} from "@/lib/cloud-sync";
import { Cloud, CloudUpload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

type DialogMode = "idle" | "prompt" | "running" | "done" | "error";

export function CloudSyncManager({ autoPrompt = true }: { autoPrompt?: boolean }) {
  const { cloudUser, activeTenant, isSuperAdmin, impersonating } = useTenant();
  const [mode, setMode] = useState<DialogMode>("idle");
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof localDataSummary>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, number> | null>(null);

  // Decide if we should auto-prompt this user.
  useEffect(() => {
    if (!autoPrompt) return;
    if (!cloudUser || !activeTenant) return;
    // Don't bug super_admin while impersonating; their local data isn't tenant data.
    if (isSuperAdmin && impersonating) return;
    if (isSuperAdmin) return;
    if (wasSyncDone(cloudUser.id)) return;

    let cancelled = false;
    (async () => {
      const has = await hasLocalData();
      if (cancelled || !has) {
        if (cloudUser) markSyncDone(cloudUser.id); // nothing to sync; don't ask again
        return;
      }
      const s = await localDataSummary();
      if (cancelled) return;
      setSummary(s);
      setMode("prompt");
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudUser?.id, activeTenant?.id, isSuperAdmin, impersonating, autoPrompt]);

  const startSync = async () => {
    if (!activeTenant) return;
    setMode("running");
    setError(null);
    setUploaded(null);
    try {
      const res = await syncLocalToCloud(activeTenant.id, (p) => setProgress(p));
      setUploaded(res.uploaded);
      setMode("done");
      if (cloudUser) markSyncDone(cloudUser.id);
      toast.success("Local data synced to cloud");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMode("error");
      toast.error("Sync failed");
    }
  };

  const dismissPrompt = () => {
    if (cloudUser) markSyncDone(cloudUser.id);
    setMode("idle");
  };
  const closeDialog = () => {
    if (mode === "prompt" && cloudUser) markSyncDone(cloudUser.id);
    setMode("idle");
  };

  if (mode === "idle") return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {mode === "prompt" && "Migrate local data to cloud"}
              {mode === "running" && "Syncing to cloud…"}
              {mode === "done" && "Sync complete"}
              {mode === "error" && "Sync failed"}
            </h3>
          </div>
          {(mode === "prompt" || mode === "done" || mode === "error") && (
            <button
              onClick={closeDialog}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </header>

        <div className="space-y-3 p-4 text-sm">
          {mode === "prompt" && summary && (
            <>
              <p className="text-muted-foreground">
                We found local data on this device. Push it to the cloud tenant{" "}
                <span className="font-semibold text-foreground">
                  {activeTenant?.company_name}
                </span>{" "}
                so it's backed up and visible across devices.
              </p>
              <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                <SummaryRow label="Companies" n={summary.companies} />
                <SummaryRow label="Years" n={summary.years} />
                <SummaryRow label="Parties" n={summary.parties} />
                <SummaryRow label="Items" n={summary.items} />
                <SummaryRow label="Challans" n={summary.challans} />
                <SummaryRow label="Teeps" n={summary.teeps} />
                <SummaryRow label="Vouchers" n={summary.vouchers} />
                <SummaryRow label="Ledger" n={summary.ledger} />
                <SummaryRow label="Stock" n={summary.stock} />
              </ul>
              <p className="text-[11px] text-muted-foreground">
                A re-sync clears this tenant's existing rows in the affected tables and
                re-uploads from your local copy. Local IndexedDB is not modified.
              </p>
            </>
          )}

          {mode === "running" && (
            <div className="space-y-2">
              <div className="font-mono text-xs text-muted-foreground">
                {progress?.step ?? "Preparing…"}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: progress
                      ? `${Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100))}%`
                      : "5%",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Don't close this tab. This usually takes seconds for typical mandi data.
              </p>
            </div>
          )}

          {mode === "done" && uploaded && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-credit">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  All local data is now mirrored in cloud.
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                {Object.entries(uploaded).map(([k, v]) => (
                  <SummaryRow key={k} label={prettyTable(k)} n={v} />
                ))}
              </ul>
            </div>
          )}

          {mode === "error" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Sync failed.</span>
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                {error}
              </pre>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
          {mode === "prompt" && (
            <>
              <button
                onClick={dismissPrompt}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
              >
                Don't ask again
              </button>
              <button
                onClick={dismissPrompt}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
              >
                Later
              </button>
              <button
                onClick={startSync}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <CloudUpload className="h-3.5 w-3.5" /> Sync now
              </button>
            </>
          )}
          {mode === "done" && (
            <button
              onClick={closeDialog}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          )}
          {mode === "error" && (
            <>
              <button
                onClick={closeDialog}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={startSync}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * Manual trigger: a button + the dialog. Use in Settings.
 */
export function CloudSyncButton() {
  const { cloudUser, activeTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [mode, setMode] = useState<"idle" | "running" | "done" | "error">("idle");
  const [uploaded, setUploaded] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !cloudUser || !activeTenant;

  const run = async () => {
    if (!activeTenant) return;
    setOpen(true);
    setMode("running");
    setUploaded(null);
    setError(null);
    try {
      const res = await syncLocalToCloud(activeTenant.id, (p) => setProgress(p));
      setUploaded(res.uploaded);
      setMode("done");
      if (cloudUser) markSyncDone(cloudUser.id);
      toast.success("Local data re-synced to cloud");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMode("error");
    }
  };

  const close = () => {
    setOpen(false);
    setMode("idle");
    setProgress(null);
  };

  return (
    <>
      <button
        onClick={run}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <CloudUpload className="h-3.5 w-3.5" />
        {disabled ? "Sign in to cloud first" : "Sync local data to cloud"}
      </button>
      {cloudUser && (
        <button
          onClick={() => {
            clearSyncDone(cloudUser.id);
            toast.message("Sync prompt re-armed for this user.");
          }}
          className="ml-2 rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
          title="Show the auto-prompt again on next load"
        >
          Reset prompt
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  {mode === "running" ? "Syncing…" : mode === "done" ? "Sync complete" : "Sync failed"}
                </h3>
              </div>
              {mode !== "running" && (
                <button onClick={close} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </header>
            <div className="space-y-3 p-4 text-sm">
              {mode === "running" && (
                <>
                  <div className="font-mono text-xs text-muted-foreground">
                    {progress?.step ?? "Preparing…"}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: progress
                          ? `${Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100))}%`
                          : "5%",
                      }}
                    />
                  </div>
                </>
              )}
              {mode === "done" && uploaded && (
                <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                  {Object.entries(uploaded).map(([k, v]) => (
                    <SummaryRow key={k} label={prettyTable(k)} n={v} />
                  ))}
                </ul>
              )}
              {mode === "error" && (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                  {error}
                </pre>
              )}
            </div>
            {mode !== "running" && (
              <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                <button
                  onClick={close}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Close
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, n }: { label: string; n: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{n}</span>
    </li>
  );
}

function prettyTable(t: string) {
  const map: Record<string, string> = {
    parties: "Parties",
    items: "Items",
    qualities: "Qualities",
    sizes: "Sizes",
    packings: "Packings",
    expense_accounts: "Expense accounts",
    stores: "Stores",
    challans: "Challans",
    teeps: "Teeps",
    stock_entries: "Stock entries",
    ledger_entries: "Ledger",
    vouchers: "Vouchers",
  };
  return map[t] ?? t;
}
