-- Map Base Role Permissions
-- This maps permissions to the core roles that were missing

-- System Admin (all permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sys_admin'::app_role, id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Tenant Admin (all except sys admin functions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin'::app_role, id FROM public.permissions 
WHERE category NOT IN ('admin')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Operations Manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id FROM public.permissions 
WHERE category IN ('ticketing', 'work_order', 'inventory', 'warranty', 'photos', 'service_orders', 'overrides')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Finance Manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance_manager'::app_role, id FROM public.permissions 
WHERE category IN ('finance', 'penalties', 'audit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Fraud Investigator
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fraud_investigator'::app_role, id FROM public.permissions 
WHERE category IN ('fraud', 'audit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Partner Admin
-- Includes work orders, tickets, inventory, service orders, photos, finance, and related operations
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id FROM public.permissions 
WHERE category IN ('ticketing', 'work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance', 'overrides')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Partner User
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_user'::app_role, id FROM public.permissions 
WHERE name IN ('wo.read', 'wo.update', 'wo.complete', 'inventory.view', 'attachment.upload', 'attachment.view', 'photo.validate', 'so.view', 'so.sign')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Technician
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'technician'::app_role, id FROM public.permissions 
WHERE name IN ('wo.read', 'wo.update', 'wo.complete', 'inventory.view', 'attachment.upload', 'attachment.view', 'photo.validate', 'so.view', 'so.sign')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Dispatcher
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'dispatcher'::app_role, id FROM public.permissions 
WHERE name IN ('ticket.read', 'ticket.update', 'ticket.assign', 'wo.read', 'wo.create', 'wo.assign', 'inventory.view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Customer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'customer'::app_role, id FROM public.permissions 
WHERE name IN ('ticket.create', 'ticket.read', 'wo.read', 'so.view', 'sapos.view', 'sapos.accept', 'sapos.decline', 'quote.view', 'invoice.view', 'invoice.pay')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ML Ops
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ml_ops'::app_role, id FROM public.permissions 
WHERE category IN ('ml_ops')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Billing Agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'billing_agent'::app_role, id FROM public.permissions 
WHERE name IN ('invoice.create', 'invoice.view', 'invoice.adjust', 'quote.create', 'quote.view', 'penalty.calculate', 'penalty.apply')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Auditor
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, id FROM public.permissions 
WHERE category IN ('compliance', 'audit')
   OR name IN ('audit.read', 'warranty.view', 'warranty.check')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Product Owner
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'product_owner'::app_role, id FROM public.permissions 
WHERE category IN ('admin', 'ml_ops')
   OR name IN ('admin.config', 'admin.features')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Support Agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'support_agent'::app_role, id FROM public.permissions 
WHERE name IN ('ticket.read', 'ticket.update', 'wo.read', 'so.view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Guest (read-only access)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'guest'::app_role, id FROM public.permissions 
WHERE name IN ('ticket.read', 'wo.read', 'so.view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check permission counts per role
SELECT 
    r.role::text as role_name,
    COUNT(rp.id) as permission_count
FROM public.role_permissions rp
JOIN (
    SELECT DISTINCT role FROM public.user_roles
) r ON r.role = rp.role
GROUP BY r.role
ORDER BY r.role;

