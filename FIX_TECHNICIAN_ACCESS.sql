-- Fix Technician Access to Work Orders
-- This ensures technicians have the wo.read permission required to access /work-orders

-- Verify technician has wo.read permission
SELECT 
    p.name,
    rp.role,
    rp.permission_id
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
AND p.name = 'wo.read';

-- If the above returns no rows, insert it:
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'technician'::app_role, id 
FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Also ensure technician has all other required permissions for field service
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'technician'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'wo.read',           -- Required for /work-orders route
  'wo.update',         -- Update work order status
  'wo.complete',       -- Mark work orders complete
  'inventory.view',    -- View inventory
  'attachment.upload', -- Upload photos/attachments
  'attachment.view',   -- View attachments
  'photo.validate',    -- Validate photos
  'so.view',          -- View service orders
  'so.sign'           -- Sign service orders
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Verify all technician permissions are now present
SELECT 
    p.name as permission_name,
    p.category,
    p.description
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
ORDER BY p.category, p.name;

-- Verify a specific technician user has the role assigned
-- Replace 'USER_EMAIL' with the actual technician email
SELECT 
    u.email,
    ur.role,
    ur.tenant_id,
    p.name as permission_name
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.role_permissions rp ON rp.role = ur.role
LEFT JOIN public.permissions p ON p.id = rp.permission_id
WHERE u.email LIKE '%tech%'
AND ur.role = 'technician'::app_role
ORDER BY u.email, p.name;

