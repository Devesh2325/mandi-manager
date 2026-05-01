/**
 * One-way uploader: pushes local IndexedDB data to the active cloud tenant.
 *
 * Design choices for Phase 3:
 *  - Cloud-first SaaS, but we keep Dexie as the live store (no UI rewrite).
 *  - This module makes Cloud a complete mirror so:
 *      • Super Admin RPCs (counts, stats, impersonation) work on real data
 *      • The user has a server-side backup
 *      • Multi-device read-replica is one config flip away later
 *  - Idempotent: a re-sync wipes the tenant's rows for the relevant tables and
 *    re-uploads from scratch. Cheap on small data, predictable for users.
 *  - Maps all local (companyId, yearId) into one tenant. We persist
 *    company/year context inside `data.company` / `year_label` for traceability.
 */
import { db } from "./db";
import { supabase } from "@/integrations/supabase/client";

export interface SyncProgress {
  step: string;
  done: number;
  total: number;
}

export interface SyncResult {
  tenantId: string;
  uploaded: Record<string, number>;
  startedAt: number;
  finishedAt: number;
}

const CHUNK = 500;

async function chunkInsert(table: string, rows: any[], onProgress: (n: number) => void) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table as any).insert(slice as any);
    if (error) throw new Error(`[${table}] ${error.message}`);
    inserted += slice.length;
    onProgress(inserted);
  }
  return inserted;
}

async function clearTenant(table: string, tenantId: string) {
  const { error } = await supabase
    .from(table as any)
    .delete()
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`[${table}] clear: ${error.message}`);
}

/** Build a year_label lookup keyed by local yearId. */
async function buildYearMap() {
  const years = await db.financialYears.toArray();
  const map = new Map<number, string>();
  for (const y of years) if (y.id != null) map.set(y.id, y.label);
  return map;
}

/** Build a company name lookup keyed by local companyId. */
async function buildCompanyMap() {
  const companies = await db.companies.toArray();
  const map = new Map<number, string>();
  for (const c of companies) if (c.id != null) map.set(c.id, c.name);
  return map;
}

/** True if there is any local user-generated data worth syncing. */
export async function hasLocalData(): Promise<boolean> {
  const counts = await Promise.all([
    db.parties.count(),
    db.items.count(),
    db.challans.count(),
    db.teeps.count(),
    db.vouchers.count(),
    db.ledger.count(),
    db.stockEntries.count(),
  ]);
  return counts.some((n) => n > 0);
}

export async function localDataSummary() {
  const [companies, years, parties, items, challans, teeps, vouchers, ledger, stock] =
    await Promise.all([
      db.companies.count(),
      db.financialYears.count(),
      db.parties.count(),
      db.items.count(),
      db.challans.count(),
      db.teeps.count(),
      db.vouchers.count(),
      db.ledger.count(),
      db.stockEntries.count(),
    ]);
  return { companies, years, parties, items, challans, teeps, vouchers, ledger, stock };
}

/**
 * Push everything to the given cloud tenant.
 * Caller must pass the active tenant id; we never guess it.
 */
export async function syncLocalToCloud(
  tenantId: string,
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  if (!tenantId) throw new Error("tenantId is required");
  const startedAt = Date.now();
  const yearMap = await buildYearMap();
  const companyMap = await buildCompanyMap();

  const uploaded: Record<string, number> = {};
  const tick = (step: string, done: number, total: number) =>
    onProgress?.({ step, done, total });

  // ---- Helpers to map a local record to a cloud row ----
  const yl = (yearId: number) => yearMap.get(yearId) ?? null;
  const cn = (companyId: number) => companyMap.get(companyId) ?? null;
  const stamp = <T extends { id?: number; companyId: number; yearId: number }>(
    r: T,
  ) => ({
    tenant_id: tenantId,
    local_id: r.id ?? null,
    year_label: yl(r.yearId),
    data: { ...r, _company: cn(r.companyId) } as any,
  });

  // ---- 1. Masters ----
  const sections: Array<{
    label: string;
    table: string;
    build: () => Promise<any[]>;
  }> = [
    {
      label: "Parties",
      table: "parties",
      build: async () => {
        const rows = await db.parties.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          short_code: r.shortCode,
          type: r.type,
          mobile: r.mobile ?? null,
          village: r.village ?? null,
          city: r.city ?? null,
          opening_balance: r.openingBalance ?? 0,
          opening_type: r.openingType ?? "Dr",
          credit_limit: r.creditLimit ?? null,
        }));
      },
    },
    {
      label: "Items",
      table: "items",
      build: async () => {
        const rows = await db.items.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          short_code: r.shortCode,
          goods_type: r.goodsType ?? null,
          unit: r.unit ?? null,
        }));
      },
    },
    {
      label: "Qualities",
      table: "qualities",
      build: async () => {
        const rows = await db.qualities.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          item_local_id: r.itemId ?? null,
        }));
      },
    },
    {
      label: "Sizes",
      table: "sizes",
      build: async () => {
        const rows = await db.sizes.toArray();
        return rows.map((r) => ({ ...stamp(r), name: r.name }));
      },
    },
    {
      label: "Packings",
      table: "packings",
      build: async () => {
        const rows = await db.packings.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          is_returnable: !!r.isReturnable,
        }));
      },
    },
    {
      label: "Expense accounts",
      table: "expense_accounts",
      build: async () => {
        const rows = await db.expenseAccounts.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          operator: r.operator,
          value: r.value,
          side: r.side,
          apply_on: r.applyOn,
          is_preset: !!r.isPreset,
        }));
      },
    },
    {
      label: "Stores",
      table: "stores",
      build: async () => {
        const rows = await db.stores.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          name: r.name,
          address: r.address ?? null,
        }));
      },
    },
    {
      label: "Challans",
      table: "challans",
      build: async () => {
        const rows = await db.challans.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          challan_no: r.challanNo,
          date: r.date,
        }));
      },
    },
    {
      label: "Teeps",
      table: "teeps",
      build: async () => {
        const rows = await db.teeps.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          teep_no: r.teepNo,
          date: r.date,
        }));
      },
    },
    {
      label: "Stock entries",
      table: "stock_entries",
      build: async () => {
        const rows = await db.stockEntries.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          date: r.date,
        }));
      },
    },
    {
      label: "Ledger",
      table: "ledger_entries",
      build: async () => {
        const rows = await db.ledger.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          date: r.date,
        }));
      },
    },
    {
      label: "Vouchers",
      table: "vouchers",
      build: async () => {
        const rows = await db.vouchers.toArray();
        return rows.map((r) => ({
          ...stamp(r),
          voucher_no: r.voucherNo,
          date: r.date,
          type: r.type,
        }));
      },
    },
  ];

  // Wipe-then-insert per table for idempotency.
  let stepIdx = 0;
  for (const s of sections) {
    stepIdx++;
    tick(`Clearing ${s.label}…`, stepIdx, sections.length);
    await clearTenant(s.table, tenantId);

    const rows = await s.build();
    if (rows.length === 0) {
      uploaded[s.table] = 0;
      continue;
    }
    tick(`Uploading ${s.label} (0/${rows.length})…`, stepIdx, sections.length);
    const inserted = await chunkInsert(s.table, rows, (n) =>
      tick(`Uploading ${s.label} (${n}/${rows.length})…`, stepIdx, sections.length),
    );
    uploaded[s.table] = inserted;
  }

  return {
    tenantId,
    uploaded,
    startedAt,
    finishedAt: Date.now(),
  };
}

/** Marker so we don't auto-prompt the same user twice. */
const SYNC_FLAG_PREFIX = "mandi.cloudSyncDone.v1.";
export function markSyncDone(userId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_FLAG_PREFIX + userId, String(Date.now()));
  }
}
export function wasSyncDone(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SYNC_FLAG_PREFIX + userId);
}
export function clearSyncDone(userId: string) {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SYNC_FLAG_PREFIX + userId);
  }
}
