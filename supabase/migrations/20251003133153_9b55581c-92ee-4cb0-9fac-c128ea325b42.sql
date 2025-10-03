-- Create security definer function to get user's tenant_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users view own tenant profiles" ON public.profiles;

-- Recreate policy without recursion using security definer function
CREATE POLICY "Users view own tenant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role) THEN (
      public.get_user_tenant_id(auth.uid()) = profiles.tenant_id
    )
    ELSE (id = auth.uid())
  END
);