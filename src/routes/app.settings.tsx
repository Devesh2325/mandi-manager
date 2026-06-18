import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, can, type AppRole } from "@/lib/db";
import { useAppSession } from "@/lib/session-context";
import { useTenant } from "@/lib/tenant-context";
import { TopBar } from "@/components/TopBar";
import { CloudSyncButton } from "@/components/CloudSync";
import { buildBrandedPdf, downloadPdf } from "@/lib/pdf";
import {
  Building2, Image as ImageIcon, Save, Upload, Trash2, Users, UserPlus,
  Eye, FileText, ShieldCheck, ShieldAlert, Cloud, Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin — full access",
  operator: "Operator — entries & sales",
  accountant: "Accountant — vouchers & ledger",
  viewer: "Viewer — read only",
};

function SettingsPage() {
  const { company, session } = useAppSession();
  const isAdmin = can(session?.role, "settings");

  if (!isAdmin) {
    return (
      <>
        <TopBar title="Settings" />
        <div className="p-8">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold">Admins only</h2>
            <p className="text-sm text-muted-foreground">
              Your role ({session?.role}) cannot view Settings. Ask an admin to grant access.
            </p>
            <Link to="/app" className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Back to dashboard</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Settings" />
      <div className="space-y-6 p-4 pb-12">
        <CompanyProfileCard />
        <UsersCard />
      </div>
    </>
  );
}



// ============================================================
// Company branding / profile
// ============================================================
function CompanyProfileCard() {
  const { company } = useAppSession();
  const [form, setForm] = useState({
    name: "", shortCode: "", address: "", gstin: "", apmcLicense: "",
    mobile: "", altMobile: "", email: "", website: "", billFooter: "",
    logoDataUrl: undefined as string | undefined,
  });
  const [saving, setSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name ?? "",
      shortCode: company.shortCode ?? "",
      address: company.address ?? "",
      gstin: company.gstin ?? "",
      apmcLicense: company.apmcLicense ?? "",
      mobile: company.mobile ?? "",
      altMobile: company.altMobile ?? "",
      email: company.email ?? "",
      website: company.website ?? "",
      billFooter: company.billFooter ?? "",
      logoDataUrl: company.logoDataUrl,
    });
  }, [company]);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type)) {
      toast.error("Logo must be PNG or JPG");
      return;
    }
    if (f.size > 800 * 1024) {
      toast.error("Logo too large (max 800 KB). Resize and retry.");
      return;
    }
    const r = new FileReader();
    r.onload = () => setForm((s) => ({ ...s, logoDataUrl: r.result as string }));
    r.readAsDataURL(f);
  };

  const save = async () => {
    if (!company?.id) return;
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      await db.companies.update(company.id, { ...form });
      toast.success("Company profile saved — PDFs will use the new branding.");
    } finally {
      setSaving(false);
    }
  };

  const buildPreviewPdf = () => buildBrandedPdf({
      company: { ...(company ?? { id: 0, createdAt: 0, name: "", shortCode: "" }), ...form },
      year: null,
      title: "Sample Report Header Preview",
      subtitle: "This is how every report PDF will look",
      columns: [
        { header: "#" },
        { header: "Description" },
        { header: "Qty", num: true },
        { header: "Amount", num: true },
      ],
      rows: [
        ["1", "Sample line one", "10.00", "₹ 1,000.00"],
        ["2", "Sample line two", "20.00", "₹ 2,500.00"],
      ],
    });

  const previewPdf = () => {
    try {
      setPreviewSrc(buildPreviewPdf().output("datauristring"));
    } catch (e) {
      toast.error("Preview failed");
      console.error(e);
    }
  };

  const downloadPreviewPdf = () => {
    try {
      downloadPdf(buildPreviewPdf(), "sample-report-header-preview.pdf");
    } catch (e) {
      toast.error("PDF download failed");
      console.error(e);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Company Profile & Branding</h2>
        </div>
        <button
          onClick={previewPdf}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <Eye className="h-3.5 w-3.5" /> Preview PDF header
        </button>
      </header>

      <div className="grid gap-6 p-4 md:grid-cols-[200px_1fr]">
        {/* Logo */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Logo</label>
          <div className="mt-2 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted">
              <Upload className="h-3 w-3" />
              {form.logoDataUrl ? "Replace" : "Upload"}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogo} />
            </label>
            {form.logoDataUrl && (
              <button
                onClick={() => setForm((s) => ({ ...s, logoDataUrl: undefined }))}
                className="rounded-md border border-input p-1.5 text-destructive hover:bg-destructive/10"
                title="Remove logo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">PNG or JPG · max 800 KB · square works best</p>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Company Name *" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
          <Field label="Short Code *" value={form.shortCode} onChange={(v) => setForm((s) => ({ ...s, shortCode: v.toUpperCase() }))} />
          <Field label="Address" value={form.address} onChange={(v) => setForm((s) => ({ ...s, address: v }))} colSpan />
          <Field label="Mobile" value={form.mobile} onChange={(v) => setForm((s) => ({ ...s, mobile: v }))} />
          <Field label="Alt. Mobile" value={form.altMobile} onChange={(v) => setForm((s) => ({ ...s, altMobile: v }))} />
          <Field label="Email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} />
          <Field label="Website" value={form.website} onChange={(v) => setForm((s) => ({ ...s, website: v }))} />
          <Field label="GSTIN" value={form.gstin} onChange={(v) => setForm((s) => ({ ...s, gstin: v.toUpperCase() }))} />
          <Field label="APMC License No." value={form.apmcLicense} onChange={(v) => setForm((s) => ({ ...s, apmcLicense: v }))} />
          <Field
            label="Bill / Invoice Footer"
            value={form.billFooter}
            onChange={(v) => setForm((s) => ({ ...s, billFooter: v }))}
            colSpan
            placeholder="e.g. Subject to Delhi jurisdiction. E. & O.E."
          />
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
        <button
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save profile"}
        </button>
      </footer>

      {previewSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="flex h-[min(88vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">PDF header preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPreviewPdf}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  onClick={() => setPreviewSrc(null)}
                  className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </header>
            <iframe
              title="PDF header preview"
              src={previewSrc}
              className="h-full w-full bg-background"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label, value, onChange, colSpan, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; colSpan?: boolean; placeholder?: string }) {
  return (
    <label className={colSpan ? "md:col-span-2" : ""}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

// ============================================================
// Users & roles
// ============================================================
function UsersCard() {
  const { session } = useAppSession();
  const { cloudUser } = useTenant();
  const ownerId = cloudUser?.id;
  const users = useLiveQuery(async () => {
    const all = await db.users.toArray();
    return ownerId
      ? all.filter((u) => u.cloudOwnerId === ownerId)
      : all.filter((u) => !u.cloudOwnerId);
  }, [ownerId]) ?? [];
  const [showInvite, setShowInvite] = useState(false);

  const remove = async (id: number, username: string) => {
    if (id === session?.userId) { toast.error("You can't delete your own account."); return; }
    if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return;
    await db.users.delete(id);
    toast.success("User removed");
  };

  const updateRole = async (id: number, role: AppRole) => {
    if (id === session?.userId && role !== "admin") {
      toast.error("You can't demote yourself. Ask another admin.");
      return;
    }
    await db.users.update(id, { role });
    toast.success("Role updated");
  };

  const toggleActive = async (id: number, active: boolean) => {
    if (id === session?.userId && !active) { toast.error("You can't disable yourself."); return; }
    await db.users.update(id, { active });
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Users & Roles</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{users.length}</span>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-3.5 w-3.5" /> Invite user
        </button>
      </header>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Mobile / Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const active = u.active !== false; // default true for legacy seeded users
              const isMe = u.id === session?.userId;
              return (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        {isMe && <div className="text-[10px] text-primary">that's you</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {u.mobile || u.email ? (
                      <>
                        {u.mobile && <div>{u.mobile}</div>}
                        {u.email && <div className="text-[11px]">{u.email}</div>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id!, e.target.value as AppRole)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(u.id!, !active)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        active ? "bg-credit/10 text-credit" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" /> {active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(u.id!, u.username)}
                      disabled={isMe}
                      className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      title={isMe ? "Can't delete yourself" : "Remove user"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
        <FileText className="mr-1 inline h-3 w-3" />
        Roles control sidebar visibility and route access. Admin = everything · Operator = challan/sale entries · Accountant = vouchers/ledger · Viewer = read-only.
      </footer>

      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} />}
    </section>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { cloudUser } = useTenant();
  const ownerId = cloudUser?.id;
  const [form, setForm] = useState({
    name: "", username: "", mobile: "", email: "", role: "operator" as AppRole,
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error("Name and username are required");
      return;
    }
    // Username uniqueness scoped to this workspace.
    const all = await db.users.where("username").equals(form.username.trim()).toArray();
    const exists = ownerId
      ? all.find((u) => u.cloudOwnerId === ownerId)
      : all.find((u) => !u.cloudOwnerId);
    if (exists) { toast.error("Username already exists"); return; }
    setBusy(true);
    try {
      await db.users.add({
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        active: true,
        invitedAt: Date.now(),
        cloudOwnerId: ownerId,
      });
      toast.success(`Invited ${form.name} as ${form.role}. They sign in with their cloud account.`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Invite user</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </header>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Full name *" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} colSpan />
          <Field label="Username *" value={form.username} onChange={(v) => setForm((s) => ({ ...s, username: v.toLowerCase() }))} />
          <Field label="Mobile" value={form.mobile} onChange={(v) => setForm((s) => ({ ...s, mobile: v }))} />

          <Field label="Email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} />
          <label className="col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as AppRole }))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </label>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <button onClick={onClose} className="rounded border border-input px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Inviting…" : "Send invite"}
          </button>
        </footer>
      </div>
    </div>
  );
}
