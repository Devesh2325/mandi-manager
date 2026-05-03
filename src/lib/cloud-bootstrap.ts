/**
 * Bridges a Supabase (cloud) session into the local IndexedDB workspace.
 *
 * New users who sign up via /auth do NOT have a local company / FY / user yet.
 * Without this bridge, RouteGuard bounces them back to /login forever because
 * /app needs a local session. This helper:
 *   - ensures a local "admin" user exists for the cloud user
 *   - ensures a local Company seeded from the active tenant
 *   - ensures a current FY for that company (with default masters seeded)
 *   - writes the local session so RouteGuard lets them through
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

  // 1) Ensure a local user mirror.
  let localUser = await db.users.where("username").equals(username).first();
  if (!localUser) {
    const id = await db.users.add({
      username,
      password: cloudUser.id, // mock — local-only, never used for cloud auth
      name: fullName,
      role: "admin" as AppRole,
      email: cloudUser.email ?? undefined,
      active: true,
    });
    localUser = await db.users.get(id);
  }

  // 2) Ensure a local Company that mirrors the active tenant.
  //    Super admin without an active tenant: fall back to the first existing
  //    company (or create a placeholder so they can browse).
  const tenantName =
    tenant?.company_name ?? (isSuperAdmin ? "Super Admin Workspace" : "My Mandi");
  const tenantCode = (tenantName.match(/[A-Za-z]/g) || ["M", "C"])
    .slice(0, 3)
    .join("")
    .toUpperCase();

  let company = await db.companies.where("name").equals(tenantName).first();
  if (!company) {
    const id = await db.companies.add({
      name: tenantName,
      shortCode: tenantCode || "MND",
      address: tenant?.address ?? undefined,
      gstin: tenant?.gst_number ?? undefined,
      apmcLicense: tenant?.license_number ?? undefined,
      createdAt: Date.now(),
    });
    company = await db.companies.get(id);
  }

  if (!company?.id) throw new Error("Failed to create local company");

  // 3) Ensure FY + seed masters.
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
