-- Add documents permission
INSERT INTO public.permissions (name, category, description) VALUES
  ('documents.view', 'documents', 'View documents'),
  ('documents.upload', 'documents', 'Upload documents'),
  ('documents.delete', 'documents', 'Delete documents')
ON CONFLICT (name) DO NOTHING;

-- Assign to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sys_admin', id FROM public.permissions 
WHERE name IN ('documents.view', 'documents.upload', 'documents.delete')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin', id FROM public.permissions 
WHERE name IN ('documents.view', 'documents.upload', 'documents.delete')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager', id FROM public.permissions 
WHERE name IN ('documents.view', 'documents.upload')
ON CONFLICT DO NOTHING;