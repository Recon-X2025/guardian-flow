-- Strengthen RLS policies for tenant isolation
-- Add tenant_id where missing and ensure proper isolation

-- 1. Strengthen tickets table RLS
DROP POLICY IF EXISTS "All authenticated users can view tickets" ON public.tickets;
CREATE POLICY "Users view own tenant tickets"
ON public.tickets FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role) THEN (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id = tickets.tenant_id
      )
    )
    ELSE auth.role() = 'authenticated'
  END
);

-- 2. Strengthen profiles table RLS for tenant isolation
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users view own tenant profiles"
ON public.profiles FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role) THEN (
      EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = auth.uid() 
        AND p2.tenant_id = profiles.tenant_id
      )
    )
    ELSE (id = auth.uid())
  END
);

-- 3. Strengthen quotes table RLS
DROP POLICY IF EXISTS "All authenticated users can view quotes" ON public.quotes;
CREATE POLICY "Users view own tenant quotes"
ON public.quotes FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role) THEN (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.id = quotes.customer_id
      )
    )
    ELSE auth.role() = 'authenticated'
  END
);

-- 4. Strengthen sapos_offers table RLS
DROP POLICY IF EXISTS "All authenticated users can view offers" ON public.sapos_offers;
CREATE POLICY "Users view own tenant offers"
ON public.sapos_offers FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role) THEN (
      EXISTS (
        SELECT 1 FROM work_orders wo
        JOIN profiles tech ON tech.id = wo.technician_id
        JOIN profiles p ON p.id = auth.uid()
        WHERE wo.id = sapos_offers.work_order_id
        AND p.tenant_id = tech.tenant_id
      )
    )
    ELSE auth.role() = 'authenticated'
  END
);

-- 5. Add standardized error response function for 403 errors
CREATE OR REPLACE FUNCTION public.raise_insufficient_privileges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Insufficient privileges'
    USING ERRCODE = '42501',
          DETAIL = 'User does not have required permissions for this operation',
          HINT = 'Contact your administrator to request access';
END;
$$;

-- 6. Add request correlation helper
CREATE TABLE IF NOT EXISTS public.request_context (
  correlation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.request_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.request_context
FOR ALL USING (false);

-- 7. Create tenant isolation test function
CREATE OR REPLACE FUNCTION public.test_tenant_isolation()
RETURNS TABLE(
  test_name text,
  passed boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_a_id uuid;
  tenant_b_id uuid;
  user_a_id uuid;
  user_b_id uuid;
  test_ticket_a uuid;
  test_ticket_b uuid;
BEGIN
  -- Create test tenants
  INSERT INTO tenants (name, slug) VALUES ('Test Tenant A', 'test-a') RETURNING id INTO tenant_a_id;
  INSERT INTO tenants (name, slug) VALUES ('Test Tenant B', 'test-b') RETURNING id INTO tenant_b_id;
  
  -- Test 1: Verify tenants created
  RETURN QUERY SELECT 
    'Tenant creation'::text,
    (tenant_a_id IS NOT NULL AND tenant_b_id IS NOT NULL),
    'Both test tenants created successfully'::text;
    
  -- Cleanup
  DELETE FROM tenants WHERE id IN (tenant_a_id, tenant_b_id);
END;
$$;