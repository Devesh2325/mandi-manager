-- ============================================================
-- BILLING: Plans + tenant subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  price_inr     numeric NOT NULL DEFAULT 0,
  period        text NOT NULL DEFAULT 'month',
  max_users     int,
  max_companies int,
  features      jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlight     boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT TO public USING (is_active = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "plans_super_write" ON public.plans;
CREATE POLICY "plans_super_write" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.plans (code, name, price_inr, period, max_users, max_companies, features, highlight, sort_order) VALUES
  ('free',     'Free',     0,    'forever', 2,    1,    '["1 company / tenant","Up to 2 users","Local + cloud sync","Basic reports"]'::jsonb, false, 1),
  ('pro',      'Pro',      999,  'month',   10,   1,    '["Unlimited parties & items","Up to 10 users","All reports & PDF exports","Priority email support","Cloud backups"]'::jsonb, true,  2),
  ('business', 'Business', 2499, 'month',   NULL, NULL, '["Multi-company workspaces","Unlimited users","Audit logs","Dedicated onboarding","Phone support"]'::jsonb, false, 3)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL UNIQUE,
  plan_id       uuid NOT NULL REFERENCES public.plans(id),
  status        text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_tenant_select" ON public.tenant_subscriptions;
CREATE POLICY "subs_tenant_select" ON public.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "subs_super_write" ON public.tenant_subscriptions;
CREATE POLICY "subs_super_write" ON public.tenant_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  tenant_id   uuid,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON public.audit_logs(actor_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
    OR actor_id = auth.uid()
  );

DROP POLICY IF EXISTS "audit_insert_self" ON public.audit_logs;
CREATE POLICY "audit_insert_self" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============================================================
-- Auto-assign Free plan when a new tenant is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_default_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM public.plans WHERE code = 'free' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'active')
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_default_plan ON public.tenants;
CREATE TRIGGER trg_tenant_default_plan AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_plan();

-- Backfill: any existing tenant without a subscription
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status)
SELECT t.id, (SELECT id FROM public.plans WHERE code='free' LIMIT 1), 'active'
FROM public.tenants t
LEFT JOIN public.tenant_subscriptions s ON s.tenant_id = t.id
WHERE s.id IS NULL;