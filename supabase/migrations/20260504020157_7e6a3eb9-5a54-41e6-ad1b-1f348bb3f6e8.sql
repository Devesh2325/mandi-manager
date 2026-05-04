
-- Leads/Enquiries table for landing page form
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  company TEXT,
  city TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  sales_notes TEXT,
  follow_up_at TIMESTAMPTZ,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous) can submit an enquiry
CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Only super admins can view/update/delete
CREATE POLICY "Super admins can view leads"
  ON public.leads FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update leads"
  ON public.leads FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete leads"
  ON public.leads FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_leads_status_created ON public.leads(status, created_at DESC);
