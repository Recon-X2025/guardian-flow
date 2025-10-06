-- DEMO visibility policy: allow all authenticated users to view all work orders
DROP POLICY IF EXISTS "Users view own tenant work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view all work orders (demo)" ON public.work_orders;

CREATE POLICY "Users can view all work orders (demo)"
ON public.work_orders
FOR SELECT
TO authenticated
USING (true);
