-- ==========================================
-- PHASE 2: SEED DATA & TEST ACCOUNTS
-- ==========================================

-- 1. Create 2 Tenants
INSERT INTO public.tenants (id, name, slug, config, active) VALUES
('11111111-1111-1111-1111-111111111111', 'TechCorp Solutions', 'techcorp', '{"features": {"mfa_required": true, "fraud_detection": true}}', true),
('22222222-2222-2222-2222-222222222222', 'ServicePro Inc', 'servicepro', '{"features": {"mfa_required": false, "fraud_detection": false}}', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Map Roles to Permissions
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
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id FROM public.permissions 
WHERE category IN ('work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance')
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

-- Auditor (read-only access)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, id FROM public.permissions 
WHERE name LIKE '%.view' OR name LIKE '%.read' OR category = 'audit'
ON CONFLICT (role, permission_id) DO NOTHING;

-- 3. Create Test User Profiles (these will be created when users sign up)
-- Note: Actual auth.users entries need to be created through Supabase Auth
-- Here we're just documenting the intended test accounts

-- Sample comment for documentation:
COMMENT ON TABLE public.user_roles IS 
'Test Accounts to Create:
1. admin@techcorp.com - sys_admin (TechCorp)
2. tenant.admin@techcorp.com - tenant_admin (TechCorp)
3. ops@techcorp.com - ops_manager (TechCorp)
4. finance@techcorp.com - finance_manager (TechCorp)
5. fraud@techcorp.com - fraud_investigator (TechCorp)
6. partner.admin@servicepro.com - partner_admin (ServicePro)
7. partner@servicepro.com - partner_user (ServicePro)
8. tech1@servicepro.com - technician (ServicePro)
9. tech2@servicepro.com - technician (ServicePro)
10. dispatch@techcorp.com - dispatcher (TechCorp)
11. customer@example.com - customer (no tenant)
12. mlops@techcorp.com - ml_ops (TechCorp)
13. billing@techcorp.com - billing_agent (TechCorp)
14. auditor@techcorp.com - auditor (TechCorp)
15. support@techcorp.com - support_agent (TechCorp)
';

-- 4. Create sample inventory items
INSERT INTO public.inventory_items (sku, description, unit_price, lead_time_days, consumable) VALUES
('COMP-001', 'Compressor Unit - 2.5 Ton', 850.00, 3, false),
('FILT-001', 'Air Filter - Standard', 15.00, 1, true),
('REF-001', 'Refrigerant R410A - 1lb', 45.00, 2, true),
('THER-001', 'Digital Thermostat', 120.00, 2, false),
('CAP-001', 'Run Capacitor 45/5', 25.00, 1, true)
ON CONFLICT (sku) DO NOTHING;

-- 5. Create sample stock levels
INSERT INTO public.stock_levels (item_id, location, qty_available, qty_reserved, min_threshold)
SELECT id, 'main', 50, 5, 10 FROM public.inventory_items WHERE sku = 'COMP-001'
UNION ALL
SELECT id, 'main', 200, 20, 50 FROM public.inventory_items WHERE sku = 'FILT-001'
UNION ALL
SELECT id, 'main', 100, 10, 25 FROM public.inventory_items WHERE sku = 'REF-001'
UNION ALL
SELECT id, 'main', 75, 8, 15 FROM public.inventory_items WHERE sku = 'THER-001'
UNION ALL
SELECT id, 'main', 150, 15, 30 FROM public.inventory_items WHERE sku = 'CAP-001'
ON CONFLICT DO NOTHING;

-- 6. Create sample warranty records
INSERT INTO public.warranty_records (unit_serial, model, warranty_start, warranty_end, coverage_type, terms_json) VALUES
('AC-2024-001', 'TurboMax 3000', '2024-01-15', '2027-01-15', 'extended', '{"parts": true, "labor": true, "emergency": true}'),
('AC-2024-002', 'CoolBreeze Pro', '2024-03-20', '2025-03-20', 'standard', '{"parts": true, "labor": false}'),
('AC-2023-100', 'Arctic Blast', '2023-06-10', '2024-06-10', 'standard', '{"parts": true, "labor": false}')
ON CONFLICT (unit_serial) DO NOTHING;

-- 7. Create sample penalty matrix entries
INSERT INTO public.penalty_matrix (penalty_code, violation_type, severity_level, base_reference, percentage_value, calculation_method, description, auto_bill, dispute_allowed, mfa_required) VALUES
('SLA-01', 'SLA Breach - Response Time', 'medium', 'invoice_subtotal', 5.00, 'percentage', 'Response time exceeded by more than 2 hours', true, true, false),
('SLA-02', 'SLA Breach - Completion Time', 'high', 'invoice_subtotal', 10.00, 'percentage', 'Work completion exceeded agreed timeline', true, true, false),
('QA-01', 'Quality Issue - Rework Required', 'high', 'invoice_subtotal', 15.00, 'percentage', 'Work quality failed inspection, rework needed', true, true, true),
('PHOTO-01', 'Missing Required Photos', 'low', 'invoice_subtotal', 2.00, 'percentage', 'Required documentation photos not submitted', true, false, false),
('PARTS-01', 'Unauthorized Parts Usage', 'critical', 'parts_cost', 100.00, 'percentage', 'Non-approved parts used without authorization', false, true, true)
ON CONFLICT (penalty_code) DO NOTHING;