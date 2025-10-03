-- Seed PC & Print test data

-- Insert sample PC & Printer inventory items (domain-appropriate SKUs)
INSERT INTO public.inventory_items (sku, description, unit_price, lead_time_days, consumable) VALUES
('PC-PSU-450W', 'Desktop Power Supply Unit 450W', 65.00, 2, false),
('PC-RAM-16GB-DDR4', 'Desktop RAM Module 16GB DDR4', 75.00, 1, false),
('PC-MB-ATX-I7', 'ATX Motherboard Intel i7 Compatible', 220.00, 3, false),
('PR-TONER-BK-HP', 'Black Toner Cartridge HP LaserJet', 89.00, 1, true),
('PR-DRUM-BR', 'Drum Unit Brother MFC Series', 110.00, 2, false),
('PR-FUSER-LP', 'Fuser Assembly LaserJet Pro', 180.00, 3, false),
('PR-ROLLER-FED', 'Paper Feed Roller Kit', 35.00, 1, true),
('MFP-SCANNER-GLASS', 'MFP Scanner Glass Replacement', 95.00, 2, false),
('PC-FAN-120MM', 'Case Fan 120mm 12V', 15.00, 1, true),
('PR-MAINTENANCE-KIT', 'Printer Maintenance Kit 200K pages', 250.00, 3, false)
ON CONFLICT (sku) DO NOTHING;

-- Insert sample warranty records for PC & Print devices
INSERT INTO public.warranty_records (unit_serial, model, warranty_start, warranty_end, coverage_type, terms_json) VALUES
('PC-2024-10001', 'HP ProDesk 400 G7', '2024-01-15', '2027-01-15', 'extended', '{"parts": true, "labor": true, "onsite": true}'),
('PR-MFP-20245', 'Brother MFC-L8900CDW', '2023-06-01', '2026-06-01', 'standard', '{"parts": true, "labor": false}'),
('PC-2024-10002', 'Dell OptiPlex 7090', '2024-03-20', '2027-03-20', 'extended', '{"parts": true, "labor": true, "onsite": false}'),
('PR-LASER-8890', 'HP LaserJet Pro M404dn', '2023-11-10', '2026-11-10', 'standard', '{"parts": true, "labor": true}'),
('MFP-SCAN-6677', 'Canon imageRUNNER 2625', '2024-02-05', '2027-02-05', 'extended', '{"parts": true, "labor": true, "onsite": true}')
ON CONFLICT (unit_serial) DO NOTHING;

-- Create sample test accounts comment (existing seed-test-accounts function handles users)
COMMENT ON TABLE public.profiles IS 'User profiles with tenant associations for PC & Print field service';

-- Update observability events to track PC & Print specific metrics
INSERT INTO public.permissions (name, category, description) VALUES
('view_pc_inventory', 'inventory', 'View PC and printer parts inventory'),
('manage_printer_parts', 'inventory', 'Manage printer-specific consumables and parts'),
('view_device_warranty', 'warranty', 'View PC and printer warranty coverage')
ON CONFLICT (name) DO NOTHING;