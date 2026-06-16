/**
 * Bridges a Supabase (cloud) session into the local IndexedDB workspace.
 *
 * Each cloud user gets their OWN local company/user records, tagged with
 * `cloudOwnerId = cloudUser.id`, so they never see another tenant's data
 * or the legacy demo seed companies.
 */
import { db, ensureCompanyHasYear, type AppRole } from "./db";
import { setSession, type Session } from "./session";
import type { CloudTenant } from "./tenant-context";

export async function bootstrapLocalFromCloud(
  cloudUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  tenant: CloudTenant | null,
  isSuperAdmin: boolean,
): Promise<{ companyId: number; yearId: number }> {
  const fullName =
    (cloudUser.user_metadata?.full_name as string | undefined) ||
    cloudUser.email ||
    "User";
  const username = (cloudUser.email || cloudUser.id).toLowerCase();
  const ownerId = cloudUser.id;

  // 1) Ensure a local user mirror scoped to this cloud user.
  let localUser = await db.users
    .where("username")
    .equals(username)
    .filter((u) => u.cloudOwnerId === ownerId)
    .first();
  if (!localUser) {
    const id = await db.users.add({
      username,
      name: fullName,
      role: "admin" as AppRole,
      email: cloudUser.email ?? undefined,
      active: true,
      cloudOwnerId: ownerId,
    });
    localUser = await db.users.get(id);
  }

  // 2) Ensure a local Company scoped to this cloud user.
  const tenantName =
    tenant?.company_name ?? (isSuperAdmin ? "Super Admin Workspace" : "My Mandi");
  const tenantCode = (tenantName.match(/[A-Za-z]/g) || ["M", "C"])
    .slice(0, 3)
    .join("")
    .toUpperCase();

  let company = await db.companies
    .filter((c) => c.cloudOwnerId === ownerId)
    .first();
  if (!company) {
    const id = await db.companies.add({
      name: tenantName,
      shortCode: tenantCode || "MND",
      address: tenant?.address ?? undefined,
      gstin: tenant?.gst_number ?? undefined,
      apmcLicense: tenant?.license_number ?? undefined,
      cloudOwnerId: ownerId,
      createdAt: Date.now(),
    });
    company = await db.companies.get(id);
  }

  if (!company?.id) throw new Error("Failed to create local company");

  // 3) Ensure FY + seed masters (scoped to this company only).
  const yearId = await ensureCompanyHasYear(company.id);

  // 4) Write local session.
  const session: Session = {
    userId: localUser!.id!,
    username: localUser!.username,
    name: localUser!.name,
    role: isSuperAdmin ? "admin" : (localUser!.role as AppRole),
    companyId: company.id,
    yearId,
  };
  setSession(session);

  return { companyId: company.id, yearId };
}
