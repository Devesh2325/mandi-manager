import Dexie, { type Table } from "dexie";

// ============ Types ============
export interface Company {
  id?: number;
  name: string;
  shortCode: string;
  address?: string;
  gstin?: string;
  /** APMC license / mandi shop license no. */
  apmcLicense?: string;
  mobile?: string;
  altMobile?: string;
  email?: string;
  website?: string;
  /** Logo as data-URL (base64 PNG/JPEG) — embedded so PDFs work fully offline. */
  logoDataUrl?: string;
  /** Optional invoice/bill footer text (terms, signature line). */
  billFooter?: string;
  /** Cloud user UUID that owns this workspace. Undefined = legacy/offline-only. */
  cloudOwnerId?: string;
  createdAt: number;
}

export interface FinancialYear {
  id?: number;
  companyId: number;
  label: string; // e.g. "2024-25"
  startDate: string; // ISO
  endDate: string; // ISO
}

export type AppRole = "admin" | "operator" | "accountant" | "viewer";

export interface User {
  id?: number;
  username: string;
  password: string; // mock only
  name: string;
  role: AppRole;
  email?: string;
  mobile?: string;
  active?: boolean;
  invitedAt?: number;
  /** Cloud workspace owner UUID. Undefined = legacy/offline demo user. */
  cloudOwnerId?: string;
}

// ===== Masters =====
export type PartyType = "farmer" | "buyer" | "agent" | "expense" | "other";

export interface Party {
  id?: number;
  companyId: number;
  yearId: number;
  type: PartyType;
  name: string;
  shortCode: string; // e.g. RAM01
  mobile?: string;
  village?: string;
  city?: string;
  openingBalance: number;
  openingType: "Dr" | "Cr";
  creditLimit?: number;
  createdAt: number;
}

export interface Item {
  id?: number;
  companyId: number;
  yearId: number;
  name: string;
  shortCode: string;
  goodsType: string; // e.g. Fruit / Vegetable
  unit: string; // Kg / Quintal / Crate
}

export interface Quality {
  id?: number;
  companyId: number;
  yearId: number;
  name: string; // A / B / Super
  itemId?: number; // optional: bind this quality to a specific item
}

export interface Size {
  id?: number;
  companyId: number;
  yearId: number;
  name: string; // Small / Medium / Large / 20Layer / 50Layer
}

export interface Packing {
  id?: number;
  companyId: number;
  yearId: number;
  name: string; // Crate / Bag / Box
  isReturnable: boolean;
}

export type ExpenseOperator = "fix" | "percent" | "perUnit";
export type ExpenseSide = "debit" | "credit";
export type ExpenseApply = "buyer" | "grower" | "both";

export interface ExpenseAccount {
  id?: number;
  companyId: number;
  yearId: number;
  name: string; // APMC / Vapsi / Hamali / Dalali
  operator: ExpenseOperator;
  value: number; // amount or %
  side: ExpenseSide;
  applyOn: ExpenseApply;
  isPreset: boolean;
}

export interface Store {
  id?: number;
  companyId: number;
  yearId: number;
  name: string;
  address?: string;
}

// ===== Entry: Challan / Arrival / Sale =====
export interface SaleLine {
  buyerId: number;
  qty: number;
  rate: number;
  amount: number;
  /** Optional per-buyer sub-packing matrix: sizeId -> {qty, rate} */
  matrix?: Record<string, { qty: number; rate: number }>;
}

export interface QualityRow {
  id: string;
  qualityId?: number;
  lotNo: string;
  sizeId?: number;
  qty: number;
  packingId?: number;
  // sub-packing matrix qty + rate per size key
  matrix?: Record<string, { qty: number; rate: number }>;
  // inline buyers
  sales: SaleLine[];
}

export interface AppliedExpense {
  expenseId?: number;
  name: string;
  amount: number;
  side: ExpenseSide;
  applyOn: ExpenseApply;
  source: "preset" | "manual";
}

export interface Challan {
  id?: number;
  companyId: number;
  yearId: number;
  challanNo: string;
  date: string; // ISO date — Arrival date
  saleDate?: string; // S-DT — sale (teep) date if different
  goodsType: string;
  farmerId: number;
  agentId?: number;
  truckNo?: string;
  trGrNo?: string; // TR/GR # — transport receipt / GR number
  sender?: string; // SENDER — dispatching party / station
  partyCd?: string; // Party Cd — quick cash-party code
  itemId: number;
  totalQty: number;
  fullPacks?: number; // Full packs (total)
  halfPacks?: number; // Half packs (total)
  /** Per-size Full/Half pack breakdown keyed by sizeId */
  packMatrix?: Record<string, { full: number; half: number }>;
  netWt?: number; // nwt — net weight
  isCashSale?: boolean; // CASH SALE flag
  qtyMatch?: boolean; // Qty Match toggle
  useSaleRate?: boolean; // Sale Rate toggle
  qualities: QualityRow[];
  expenses: AppliedExpense[];
  notes?: string;
  createdAt: number;
}

// ===== Stock & Teep & Ledger =====
export interface StockEntry {
  id?: number;
  companyId: number;
  yearId: number;
  challanId: number;
  itemId: number;
  qualityId?: number;
  storeId?: number;
  qtyIn: number;
  qtyOut: number;
  date: string;
}

export interface Teep {
  id?: number;
  companyId: number;
  yearId: number;
  teepNo: string;
  date: string;
  challanId: number;
  buyerId: number;
  itemId: number;
  qualityId?: number;
  qty: number;
  rate: number;
  gross: number;
  expenses: AppliedExpense[];
  net: number;
}

export interface LedgerEntry {
  id?: number;
  companyId: number;
  yearId: number;
  date: string;
  partyId: number;
  refType: "challan" | "teep" | "voucher" | "opening";
  refId: number;
  narration: string;
  debit: number;
  credit: number;
}

export type VoucherType = "payment" | "receipt" | "journal";
export interface Voucher {
  id?: number;
  companyId: number;
  yearId: number;
  type: VoucherType;
  voucherNo: string;
  date: string;
  partyId: number;
  amount: number;
  narration?: string;
}

// ============ DB ============
class MandiDB extends Dexie {
  companies!: Table<Company, number>;
  financialYears!: Table<FinancialYear, number>;
  users!: Table<User, number>;

  parties!: Table<Party, number>;
  items!: Table<Item, number>;
  qualities!: Table<Quality, number>;
  sizes!: Table<Size, number>;
  packings!: Table<Packing, number>;
  expenseAccounts!: Table<ExpenseAccount, number>;
  stores!: Table<Store, number>;

  challans!: Table<Challan, number>;
  stockEntries!: Table<StockEntry, number>;
  teeps!: Table<Teep, number>;
  ledger!: Table<LedgerEntry, number>;
  vouchers!: Table<Voucher, number>;

  constructor() {
    super("MandiERP");
    this.version(1).stores({
      companies: "++id, shortCode, name",
      financialYears: "++id, companyId, label",
      users: "++id, username",

      parties: "++id, [companyId+yearId], [companyId+yearId+type], shortCode, name",
      items: "++id, [companyId+yearId], shortCode, name",
      qualities: "++id, [companyId+yearId], name",
      sizes: "++id, [companyId+yearId], name",
      packings: "++id, [companyId+yearId], name",
      expenseAccounts: "++id, [companyId+yearId], name",
      stores: "++id, [companyId+yearId], name",

      challans: "++id, [companyId+yearId], challanNo, date, farmerId, itemId",
      stockEntries: "++id, [companyId+yearId], challanId, itemId, date",
      teeps: "++id, [companyId+yearId], teepNo, date, buyerId, challanId",
      ledger: "++id, [companyId+yearId], partyId, date, refType",
      vouchers: "++id, [companyId+yearId], voucherNo, date, partyId, type",
    });
    // v2: extended company branding + accountant role + user invite fields.
    // No index changes needed; Dexie auto-migrates added optional columns.
    this.version(2).stores({});
  }
}

export const db = new MandiDB();

// ============ Permissions ============
/**
 * Permissions matrix per role.
 * - admin       → everything (settings, users, masters, entries, reports)
 * - operator    → entries (challan/voucher), stock sale, view masters & reports
 * - accountant  → ledger/cashbook/trial-balance write, vouchers, reports — no settings/users
 * - viewer      → read-only across reports & ledgers
 */
export const ROLE_PERMS: Record<AppRole, {
  settings: boolean;
  manageUsers: boolean;
  manageMasters: boolean;
  entry: boolean;     // challan, stock sale
  voucher: boolean;
  reports: boolean;
}> = {
  admin:      { settings: true,  manageUsers: true,  manageMasters: true,  entry: true,  voucher: true,  reports: true },
  operator:   { settings: false, manageUsers: false, manageMasters: false, entry: true,  voucher: true,  reports: true },
  accountant: { settings: false, manageUsers: false, manageMasters: false, entry: false, voucher: true,  reports: true },
  viewer:     { settings: false, manageUsers: false, manageMasters: false, entry: false, voucher: false, reports: true },
};

export function can(role: AppRole | undefined, perm: keyof typeof ROLE_PERMS["admin"]): boolean {
  if (!role) return false;
  return ROLE_PERMS[role]?.[perm] ?? false;
}

// ============ Seed ============
/**
 * Seed defaults into local IndexedDB.
 *
 * For cloud-authenticated users we MUST NOT create the demo companies / users —
 * otherwise a new tenant signing up sees "Shree Balaji Trading Co." plus the
 * demo `admin`/`munim` accounts mixed in with their own workspace. Their own
 * workspace + admin user is created by `bootstrapLocalFromCloud`.
 *
 * Demo seed only runs in pure offline mode (no cloud session).
 */
function hasCloudSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = localStorage.getItem(k);
        if (v && v !== "null") return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

export async function seedIfEmpty() {
  const cloud = hasCloudSession();

  const userCount = await db.users.count();
  if (userCount === 0 && !cloud) {
    await db.users.bulkAdd([
      { username: "admin", password: "admin", name: "Administrator", role: "admin" },
      { username: "munim", password: "munim", name: "Munim ji", role: "operator" },
    ]);
  }

  const companyCount = await db.companies.count();
  if (companyCount === 0 && !cloud) {
    const cId = await db.companies.add({
      name: "Shree Balaji Trading Co.",
      shortCode: "SBT",
      address: "Shop 12, Azadpur Mandi, Delhi",
      gstin: "07ABCDE1234F1Z5",
      createdAt: Date.now(),
    });
    const c2 = await db.companies.add({
      name: "Mahalaxmi Fruits",
      shortCode: "MLF",
      address: "Gate 4, Azadpur Mandi",
      createdAt: Date.now(),
    });
    const yId = await db.financialYears.add({
      companyId: cId,
      label: "2024-25",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });
    await db.financialYears.add({
      companyId: cId,
      label: "2023-24",
      startDate: "2023-04-01",
      endDate: "2024-03-31",
    });
    await db.financialYears.add({
      companyId: c2,
      label: "2024-25",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });

    // Seed masters for first company+year
    await seedMasters(cId, yId);
  }
}

export async function seedMasters(companyId: number, yearId: number) {
  const now = Date.now();

  // Each master table is seeded independently — only when that specific table is
  // empty for this (companyId, yearId) scope. New companies/years get the full
  // default set; deleting individual records won't trigger a re-seed.

  if ((await db.parties.where({ companyId, yearId }).count()) === 0) {
    await db.parties.bulkAdd([
      { companyId, yearId, type: "farmer", name: "Ram Kumar", shortCode: "RAM01", mobile: "9876543210", village: "Sonipat", openingBalance: 0, openingType: "Cr", createdAt: now },
      { companyId, yearId, type: "farmer", name: "Shyam Singh", shortCode: "SHY01", village: "Karnal", openingBalance: 5000, openingType: "Cr", createdAt: now },
      { companyId, yearId, type: "buyer", name: "Gupta Traders", shortCode: "GUP01", city: "Delhi", openingBalance: 12000, openingType: "Dr", createdAt: now },
      { companyId, yearId, type: "buyer", name: "Sharma & Sons", shortCode: "SHA01", city: "Ghaziabad", openingBalance: 0, openingType: "Dr", createdAt: now },
      { companyId, yearId, type: "buyer", name: "Mahavir Vegetables", shortCode: "MAH01", city: "Noida", openingBalance: 8500, openingType: "Dr", createdAt: now },
      { companyId, yearId, type: "agent", name: "Kishan Lal Agent", shortCode: "AGT01", openingBalance: 0, openingType: "Cr", createdAt: now },
    ]);
  }

  if ((await db.items.where({ companyId, yearId }).count()) === 0) {
    await db.items.bulkAdd([
      { companyId, yearId, name: "Apple", shortCode: "APL", goodsType: "Fruit", unit: "Kg" },
      { companyId, yearId, name: "Tomato", shortCode: "TOM", goodsType: "Vegetable", unit: "Kg" },
      { companyId, yearId, name: "Onion", shortCode: "ONI", goodsType: "Vegetable", unit: "Kg" },
      { companyId, yearId, name: "Potato", shortCode: "POT", goodsType: "Vegetable", unit: "Kg" },
      { companyId, yearId, name: "Mango", shortCode: "MAN", goodsType: "Fruit", unit: "Kg" },
    ]);
  }

  if ((await db.qualities.where({ companyId, yearId }).count()) === 0) {
    await db.qualities.bulkAdd([
      { companyId, yearId, name: "Super" },
      { companyId, yearId, name: "A Grade" },
      { companyId, yearId, name: "B Grade" },
      { companyId, yearId, name: "C Grade" },
    ]);
  }

  if ((await db.sizes.where({ companyId, yearId }).count()) === 0) {
    await db.sizes.bulkAdd([
      { companyId, yearId, name: "Small" },
      { companyId, yearId, name: "Medium" },
      { companyId, yearId, name: "Large" },
      { companyId, yearId, name: "20 Layer" },
      { companyId, yearId, name: "50 Layer" },
    ]);
  }

  if ((await db.packings.where({ companyId, yearId }).count()) === 0) {
    await db.packings.bulkAdd([
      { companyId, yearId, name: "Crate", isReturnable: true },
      { companyId, yearId, name: "Bag", isReturnable: false },
      { companyId, yearId, name: "Box", isReturnable: false },
      { companyId, yearId, name: "Carton", isReturnable: false },
    ]);
  }

  if ((await db.expenseAccounts.where({ companyId, yearId }).count()) === 0) {
    await db.expenseAccounts.bulkAdd([
      { companyId, yearId, name: "APMC Cess", operator: "percent", value: 1, side: "debit", applyOn: "grower", isPreset: true },
      { companyId, yearId, name: "Commission (Dalali)", operator: "percent", value: 6, side: "debit", applyOn: "grower", isPreset: true },
      { companyId, yearId, name: "Hamali", operator: "perUnit", value: 2, side: "debit", applyOn: "grower", isPreset: true },
      { companyId, yearId, name: "Vapsi (Returns)", operator: "fix", value: 0, side: "debit", applyOn: "buyer", isPreset: true },
      { companyId, yearId, name: "Tulai (Weighing)", operator: "perUnit", value: 1, side: "debit", applyOn: "grower", isPreset: true },
    ]);
  }

  if ((await db.stores.where({ companyId, yearId }).count()) === 0) {
    await db.stores.bulkAdd([
      { companyId, yearId, name: "Main Store" },
      { companyId, yearId, name: "Cold Storage" },
    ]);
  }
}

/**
 * Create a default financial year for a brand-new company and seed its masters.
 * Used when the user creates a new company so it isn't blank.
 */
export async function ensureCompanyHasYear(companyId: number): Promise<number> {
  const existing = await db.financialYears.where("companyId").equals(companyId).first();
  if (existing?.id) {
    await seedMasters(companyId, existing.id);
    return existing.id;
  }
  // Auto-build a current FY (Apr → Mar India fiscal)
  const today = new Date();
  const y = today.getFullYear();
  const startYear = today.getMonth() >= 3 ? y : y - 1;
  const label = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
  const yearId = await db.financialYears.add({
    companyId,
    label,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  });
  await seedMasters(companyId, yearId);
  return yearId;
}

