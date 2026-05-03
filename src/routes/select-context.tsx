import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { useAppSession } from "@/lib/session-context";
import { useTenant } from "@/lib/tenant-context";
import { Building2, CalendarRange, ArrowRight, LogOut } from "lucide-react";

export const Route = createFileRoute("/select-context")({
  component: SelectContextPage,
});

function SelectContextPage() {
  const { session, selectContext, logout } = useAppSession();
  const { cloudUser } = useTenant();
  const ownerId = cloudUser?.id;
  const navigate = useNavigate();
  const companies = useLiveQuery(async () => {
    const all = await db.companies.toArray();
    return ownerId
      ? all.filter((c) => c.cloudOwnerId === ownerId)
      : all.filter((c) => !c.cloudOwnerId);
  }, [ownerId]) ?? [];
  const [companyId, setCompanyId] = useState<number | null>(null);
  const years = useLiveQuery(
    async () =>
      companyId ? await db.financialYears.where("companyId").equals(companyId).toArray() : [],
    [companyId],
  ) ?? [];
  const [yearId, setYearId] = useState<number | null>(null);

  const proceed = async () => {
    if (!companyId || !yearId) return;
    await selectContext(companyId, yearId);
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Select workspace</h1>
            <p className="text-xs text-muted-foreground">
              Welcome {session?.name}. Pick the company and financial year to load.
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded border border-input px-3 py-1.5 text-xs hover:bg-muted"
          >
            <LogOut className="h-3 w-3" /> Logout
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Companies */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> Company
            </div>
            <div className="space-y-1.5">
              {companies.map((c) => {
                const active = c.id === companyId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(c.id!);
                      setYearId(null);
                    }}
                    className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.shortCode} · {c.address ?? "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Years */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" /> Financial Year
            </div>
            {!companyId ? (
              <div className="rounded border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
                Pick a company first
              </div>
            ) : years.length === 0 ? (
              <div className="rounded border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
                No financial years for this company
              </div>
            ) : (
              <div className="space-y-1.5">
                {years.map((y) => {
                  const active = y.id === yearId;
                  return (
                    <button
                      key={y.id}
                      onClick={() => setYearId(y.id!)}
                      className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      <div className="text-sm font-medium">FY {y.label}</div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {y.startDate} → {y.endDate}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button
            disabled={!companyId || !yearId}
            onClick={proceed}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Load Workspace <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
