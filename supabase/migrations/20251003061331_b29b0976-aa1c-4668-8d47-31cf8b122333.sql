-- Enable RLS on quotes table
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view quotes"
  ON public.quotes FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Managers can manage quotes"
  ON public.quotes FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));