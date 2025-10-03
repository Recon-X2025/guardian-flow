-- Add workorders.complete permission if it doesn't exist
INSERT INTO permissions (name, description, category)
VALUES ('workorders.complete', 'Complete work orders after validation', 'workorders')
ON CONFLICT (name) DO NOTHING;

-- Grant complete permission to technicians and above
INSERT INTO role_permissions (role, permission_id)
SELECT 'technician', id FROM permissions WHERE name = 'workorders.complete'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'ops_manager', id FROM permissions WHERE name = 'workorders.complete'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant_admin', id FROM permissions WHERE name = 'workorders.complete'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'sys_admin', id FROM permissions WHERE name = 'workorders.complete'
ON CONFLICT DO NOTHING;