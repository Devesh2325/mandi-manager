
-- =========================================================
-- 1. ROLE ENUM + helper
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'tenant_admin', 'operator', 'accountant', 'viewer');

-- =========================================================
-- 2. TENANTS
-- =========================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  gst_number TEXT,
  license_number TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  default_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_write_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.has_tenant_role(_user_id, _tenant_id, 'tenant_admin')
      OR public.has_tenant_role(_user_id, _tenant_id, 'operator')
      OR public.has_tenant_role(_user_id, _tenant_id, 'accountant')
$$;

-- =========================================================
-- 6. RLS POLICIES — tenants / profiles / user_roles
-- =========================================================
-- tenants
CREATE POLICY "tenants_select_member_or_super"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), id));

CREATE POLICY "tenants_insert_super_or_self_signup"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR owner_user_id = auth.uid());

CREATE POLICY "tenants_update_super_or_admin"
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), id, 'tenant_admin'));

CREATE POLICY "tenants_delete_super"
  ON public.tenants FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- profiles
CREATE POLICY "profiles_select_self_or_super"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_self_or_super"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY "user_roles_select_self_tenant_or_super"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  );

CREATE POLICY "user_roles_insert_super_or_admin"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin') AND role <> 'super_admin')
  );

CREATE POLICY "user_roles_update_super_or_admin"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin') AND role <> 'super_admin')
  );

CREATE POLICY "user_roles_delete_super_or_admin"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin') AND role <> 'super_admin')
  );

-- =========================================================
-- 7. UPDATED_AT TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_touch
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_profiles_touch
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 8. SIGNUP HANDLER — creates profile, tenant, role
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company_name TEXT;
  _gst TEXT;
  _license TEXT;
  _full_name TEXT;
  _tenant_id UUID;
  _is_super BOOLEAN := FALSE;
BEGIN
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', NULL);
  _gst          := NEW.raw_user_meta_data->>'gst_number';
  _license      := NEW.raw_user_meta_data->>'license_number';
  _full_name    := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Super admin bootstrap
  IF lower(NEW.email) = lower('dmchaturvedi@gmail.com') THEN
    _is_super := TRUE;
  END IF;

  -- Always create a profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, _full_name, NEW.email);

  IF _is_super THEN
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, NULL, 'super_admin');
  ELSIF _company_name IS NOT NULL AND length(trim(_company_name)) > 0 THEN
    INSERT INTO public.tenants (company_name, gst_number, license_number, owner_user_id)
    VALUES (_company_name, _gst, _license, NEW.id)
    RETURNING id INTO _tenant_id;

    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, _tenant_id, 'tenant_admin');

    UPDATE public.profiles SET default_tenant_id = _tenant_id WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 9. CLOUD MIRROR OF MANDI DATA TABLES (with tenant_id + RLS)
-- =========================================================
-- Generic helper to apply tenant-scoped RLS
CREATE OR REPLACE FUNCTION public.apply_tenant_rls(_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', _table);
  EXECUTE format($p$
    CREATE POLICY "%s_select_tenant" ON public.%I FOR SELECT TO authenticated
    USING (public.is_tenant_member(auth.uid(), tenant_id));
  $p$, _table, _table);
  EXECUTE format($p$
    CREATE POLICY "%s_insert_tenant" ON public.%I FOR INSERT TO authenticated
    WITH CHECK (public.can_write_tenant(auth.uid(), tenant_id));
  $p$, _table, _table);
  EXECUTE format($p$
    CREATE POLICY "%s_update_tenant" ON public.%I FOR UPDATE TO authenticated
    USING (public.can_write_tenant(auth.uid(), tenant_id));
  $p$, _table, _table);
  EXECUTE format($p$
    CREATE POLICY "%s_delete_tenant" ON public.%I FOR DELETE TO authenticated
    USING (public.can_write_tenant(auth.uid(), tenant_id));
  $p$, _table, _table);
END;
$$;

-- parties
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT,
  year_label TEXT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  mobile TEXT, village TEXT, city TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  opening_type TEXT NOT NULL DEFAULT 'Dr',
  credit_limit NUMERIC,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parties_tenant ON public.parties(tenant_id);
SELECT public.apply_tenant_rls('parties');

-- items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT,
  year_label TEXT,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  goods_type TEXT,
  unit TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_tenant ON public.items(tenant_id);
SELECT public.apply_tenant_rls('items');

-- qualities, sizes, packings, expense_accounts, stores  (lookups -> JSON-light)
CREATE TABLE public.qualities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  name TEXT NOT NULL, item_local_id BIGINT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qualities_tenant ON public.qualities(tenant_id);
SELECT public.apply_tenant_rls('qualities');

CREATE TABLE public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT, name TEXT NOT NULL,
  data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sizes_tenant ON public.sizes(tenant_id);
SELECT public.apply_tenant_rls('sizes');

CREATE TABLE public.packings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  name TEXT NOT NULL, is_returnable BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_packings_tenant ON public.packings(tenant_id);
SELECT public.apply_tenant_rls('packings');

CREATE TABLE public.expense_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  name TEXT NOT NULL, operator TEXT, value NUMERIC, side TEXT, apply_on TEXT, is_preset BOOLEAN DEFAULT FALSE,
  data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_accounts_tenant ON public.expense_accounts(tenant_id);
SELECT public.apply_tenant_rls('expense_accounts');

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  name TEXT NOT NULL, address TEXT,
  data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_tenant ON public.stores(tenant_id);
SELECT public.apply_tenant_rls('stores');

-- transactions
CREATE TABLE public.challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  challan_no TEXT NOT NULL, date DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_challans_tenant ON public.challans(tenant_id);
SELECT public.apply_tenant_rls('challans');

CREATE TABLE public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  date DATE NOT NULL, data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_tenant ON public.stock_entries(tenant_id);
SELECT public.apply_tenant_rls('stock_entries');

CREATE TABLE public.teeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  teep_no TEXT NOT NULL, date DATE NOT NULL, data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teeps_tenant ON public.teeps(tenant_id);
SELECT public.apply_tenant_rls('teeps');

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  date DATE NOT NULL, data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_tenant ON public.ledger_entries(tenant_id);
SELECT public.apply_tenant_rls('ledger_entries');

CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  local_id BIGINT, year_label TEXT,
  voucher_no TEXT NOT NULL, date DATE NOT NULL, type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vouchers_tenant ON public.vouchers(tenant_id);
SELECT public.apply_tenant_rls('vouchers');

-- =========================================================
-- 10. SUPER ADMIN STATS RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.super_admin_stats()
RETURNS TABLE(total_tenants BIGINT, active_tenants BIGINT, total_users BIGINT, total_challans BIGINT, total_teeps BIGINT, total_vouchers BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.tenants),
    (SELECT count(*) FROM public.tenants WHERE status = 'active'),
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.challans),
    (SELECT count(*) FROM public.teeps),
    (SELECT count(*) FROM public.vouchers)
  WHERE public.is_super_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.super_admin_tenant_stats()
RETURNS TABLE(tenant_id UUID, company_name TEXT, status TEXT, user_count BIGINT, challan_count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.company_name, t.status,
    (SELECT count(*) FROM public.user_roles ur WHERE ur.tenant_id = t.id),
    (SELECT count(*) FROM public.challans c WHERE c.tenant_id = t.id)
  FROM public.tenants t
  WHERE public.is_super_admin(auth.uid())
  ORDER BY t.created_at DESC;
$$;
