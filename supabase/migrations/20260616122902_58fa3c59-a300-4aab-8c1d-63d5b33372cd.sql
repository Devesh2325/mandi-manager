
-- 1) Restrict tenant_subscriptions writes to super_admin only.
DROP POLICY IF EXISTS subs_super_write ON public.tenant_subscriptions;
CREATE POLICY subs_super_write ON public.tenant_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 2) Tighten the public lead-submission policy: drop the WITH CHECK (true)
--    permissive rule and require status='new' so visitors cannot pre-set
--    triage/assignment fields.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND assigned_to IS NULL
    AND follow_up_at IS NULL
    AND sales_notes IS NULL
  );

-- 3) Lock down SECURITY DEFINER functions: revoke broad EXECUTE and
--    re-grant only what each role actually needs.
REVOKE ALL ON FUNCTION public.super_admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.super_admin_tenant_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_tenant_stats() TO authenticated;

-- Internal trigger / bootstrap helpers should never be callable by clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_default_plan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: revoke anon, keep authenticated (used inside policies).
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_tenant_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_tenant_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.can_write_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_tenant(uuid, uuid) TO authenticated;
