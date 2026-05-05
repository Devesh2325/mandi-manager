import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  tenant_id?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  meta?: Record<string, unknown>;
}

/** Fire-and-forget audit logger. RLS allows insert when actor_id = auth.uid(). */
export async function logAudit(action: string, entry: AuditEntry = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    tenant_id: entry.tenant_id ?? null,
    action,
    target_type: entry.target_type ?? null,
    target_id: entry.target_id ?? null,
    meta: entry.meta ?? {},
  });
}
