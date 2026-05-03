import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, seedMasters, ensureCompanyHasYear, type Company, type FinancialYear } from "@/lib/db";
import { useAppSession } from "@/lib/session-context";
import { useTenant } from "@/lib/tenant-context";
import { Plus, Trash2, Pencil, Building2, CalendarRange, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/masters/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { company: activeCompany, year: activeYear, selectContext } = useAppSession();
  const { cloudUser } = useTenant();
  const ownerId = cloudUser?.id;
  const companies = useLiveQuery(async () => {
    const all = await db.companies.toArray();
    return ownerId
      ? all.filter((c) => c.cloudOwnerId === ownerId)
      : all.filter((c) => !c.cloudOwnerId);
  }, [ownerId]) ?? [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    activeCompany?.id ?? null,
  );
  const years = useLiveQuery(
    async () =>
      selectedCompanyId
        ? await db.financialYears.where("companyId").equals(selectedCompanyId).toArray()
        : [],
    [selectedCompanyId],
  ) ?? [];

  const [editingCo, setEditingCo] = useState<Partial<Company> | null>(null);
  const [editingFy, setEditingFy] = useState<Partial<FinancialYear> | null>(null);

  const saveCompany = async () => {
    if (!editingCo || !editingCo.name || !editingCo.shortCode) return;
    const data: Company = {
      name: editingCo.name,
      shortCode: editingCo.shortCode,
      address: editingCo.address,
      gstin: editingCo.gstin,
      cloudOwnerId: editingCo.cloudOwnerId ?? ownerId,
      createdAt: editingCo.createdAt ?? Date.now(),
    };
    if (editingCo.id) {
      await db.companies.update(editingCo.id, data);
    } else {
      const newId = await db.companies.add(data);
      // Auto-create a default FY + seed masters so the new company is usable immediately.
      await ensureCompanyHasYear(newId as number);
      setSelectedCompanyId(newId as number);
    }
    setEditingCo(null);
  };

  const deleteCompany = async (id: number) => {
    if (!confirm("Delete this company and ALL its financial years & data?")) return;
    await db.companies.delete(id);
    await db.financialYears.where("companyId").equals(id).delete();
    if (selectedCompanyId === id) setSelectedCompanyId(null);
  };

  const saveFy = async () => {
    if (!editingFy || !editingFy.label || !editingFy.startDate || !editingFy.endDate) return;
    if (!selectedCompanyId) return;
    const data: FinancialYear = {
      companyId: selectedCompanyId,
      label: editingFy.label,
      startDate: editingFy.startDate,
      endDate: editingFy.endDate,
    };
    if (editingFy.id) {
      await db.financialYears.update(editingFy.id, data);
    } else {
      const newId = await db.financialYears.add(data);
      await seedMasters(selectedCompanyId, newId);
    }
    setEditingFy(null);
  };

  const deleteFy = async (id: number) => {
    if (!confirm("Delete this financial year? All masters & entries within it will remain orphaned."))
      return;
    await db.financialYears.delete(id);
  };

  const switchTo = async (companyId: number, yearId: number) => {
    await selectContext(companyId, yearId);
  };

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      {/* Companies */}
      <section className="rounded-2xl border border-border bg-card p-4 pebble">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Companies</h2>
          </div>
          <button
            onClick={() => setEditingCo({})}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" /> New Company
          </button>
        </header>

        <div className="space-y-1.5">
          {companies.length === 0 && (
            <div className="rounded-lg border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
              No companies. Click "New Company".
            </div>
          )}
          {companies.map((c) => {
            const isSelected = c.id === selectedCompanyId;
            const isActive = c.id === activeCompany?.id;
            return (
              <div
                key={c.id}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  isSelected ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setSelectedCompanyId(c.id!)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {c.name}
                      {isActive && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.shortCode} · {c.address ?? "—"}
                      {c.gstin ? ` · ${c.gstin}` : ""}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCo(c)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteCompany(c.id!)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financial Years */}
      <section className="rounded-2xl border border-border bg-card p-4 pebble">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">
              Financial Years
              {selectedCompanyId && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  · {companies.find((c) => c.id === selectedCompanyId)?.shortCode}
                </span>
              )}
            </h2>
          </div>
          <button
            disabled={!selectedCompanyId}
            onClick={() => setEditingFy({})}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> New Year
          </button>
        </header>

        {!selectedCompanyId ? (
          <div className="rounded-lg border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
            Select a company to manage its financial years
          </div>
        ) : years.length === 0 ? (
          <div className="rounded-lg border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
            No financial years for this company
          </div>
        ) : (
          <div className="space-y-1.5">
            {years.map((y) => {
              const isActive = y.id === activeYear?.id && selectedCompanyId === activeCompany?.id;
              return (
                <div
                  key={y.id}
                  className="rounded-lg border border-input px-3 py-2 hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        FY {y.label}
                        {isActive && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {y.startDate} → {y.endDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <button
                          onClick={() => switchTo(selectedCompanyId, y.id!)}
                          className="rounded border border-input px-2 py-1 text-[11px] hover:bg-background"
                        >
                          Switch
                        </button>
                      )}
                      <button
                        onClick={() => setEditingFy(y)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteFy(y.id!)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Company modal */}
      {editingCo && (
        <Modal title={editingCo.id ? "Edit Company" : "New Company"} onClose={() => setEditingCo(null)}>
          <div className="grid gap-3">
            <Field label="Name *">
              <input
                value={editingCo.name ?? ""}
                onChange={(e) => setEditingCo({ ...editingCo, name: e.target.value })}
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Short Code *">
              <input
                value={editingCo.shortCode ?? ""}
                onChange={(e) =>
                  setEditingCo({ ...editingCo, shortCode: e.target.value.toUpperCase() })
                }
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm uppercase"
              />
            </Field>
            <Field label="Address">
              <input
                value={editingCo.address ?? ""}
                onChange={(e) => setEditingCo({ ...editingCo, address: e.target.value })}
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="GSTIN">
              <input
                value={editingCo.gstin ?? ""}
                onChange={(e) => setEditingCo({ ...editingCo, gstin: e.target.value.toUpperCase() })}
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm uppercase"
              />
            </Field>
          </div>
          <ModalFooter onCancel={() => setEditingCo(null)} onSave={saveCompany} />
        </Modal>
      )}

      {/* FY modal */}
      {editingFy && (
        <Modal
          title={editingFy.id ? "Edit Financial Year" : "New Financial Year"}
          onClose={() => setEditingFy(null)}
        >
          <div className="grid gap-3">
            <Field label="Label * (e.g. 2025-26)">
              <input
                value={editingFy.label ?? ""}
                onChange={(e) => setEditingFy({ ...editingFy, label: e.target.value })}
                placeholder="2025-26"
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date *">
                <input
                  type="date"
                  value={editingFy.startDate ?? ""}
                  onChange={(e) => setEditingFy({ ...editingFy, startDate: e.target.value })}
                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="End Date *">
                <input
                  type="date"
                  value={editingFy.endDate ?? ""}
                  onChange={(e) => setEditingFy({ ...editingFy, endDate: e.target.value })}
                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
            {!editingFy.id && (
              <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                Default masters (parties, items, qualities, expenses…) will be seeded for this new year.
              </p>
            )}
          </div>
          <ModalFooter onCancel={() => setEditingFy(null)} onSave={saveFy} />
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 pebble">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <button
        onClick={onCancel}
        className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Save
      </button>
    </div>
  );
}
