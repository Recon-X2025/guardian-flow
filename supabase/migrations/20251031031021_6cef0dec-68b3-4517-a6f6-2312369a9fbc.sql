-- ============================================================================
-- SPRINT 1: Multi-Organization Foundation
-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Organization settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, setting_key)
);

-- ============================================================================
-- SPRINT 2: Customer Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  customer_number TEXT UNIQUE,
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  customer_type TEXT DEFAULT 'individual',
  status TEXT DEFAULT 'active',
  credit_limit NUMERIC DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  tax_id TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  address_type TEXT DEFAULT 'billing',
  street TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  latitude NUMERIC,
  longitude NUMERIC,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SPRINT 3: Technician & Field Force Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  tenant_id UUID REFERENCES public.tenants(id),
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  certification_level TEXT,
  certifications TEXT[],
  specializations TEXT[],
  home_location JSONB,
  current_location JSONB,
  vehicle_info JSONB,
  photo_url TEXT,
  hire_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technician_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(technician_id, date, start_time)
);

CREATE TABLE IF NOT EXISTS public.technician_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  certified BOOLEAN DEFAULT false,
  certification_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(technician_id, skill_name)
);

CREATE TABLE IF NOT EXISTS public.technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT now(),
  speed NUMERIC,
  heading NUMERIC
);

-- ============================================================================
-- SPRINT 4: Equipment & Asset Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  equipment_number TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  purchase_date DATE,
  purchase_price NUMERIC,
  installation_date DATE,
  warranty_expiry DATE,
  status TEXT DEFAULT 'active',
  location JSONB,
  qr_code TEXT UNIQUE,
  specifications JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id),
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ DEFAULT now(),
  technician_id UUID REFERENCES public.technicians(id),
  description TEXT,
  parts_used JSONB,
  cost NUMERIC,
  downtime_hours NUMERIC,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL,
  frequency_days INTEGER NOT NULL,
  last_maintenance_date DATE,
  next_maintenance_date DATE NOT NULL,
  task_description TEXT,
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES public.technicians(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SPRINT 5: Customer Self-Service Portal
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  access_level TEXT DEFAULT 'view',
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  equipment_id UUID REFERENCES public.equipment(id),
  request_number TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'submitted',
  preferred_date DATE,
  preferred_time_slot TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  location JSONB,
  photos TEXT[],
  converted_to_ticket_id UUID REFERENCES public.tickets(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SPRINT 6: Service Contracts & Recurring Revenue
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  contract_number TEXT UNIQUE,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  billing_frequency TEXT DEFAULT 'monthly',
  billing_day INTEGER DEFAULT 1,
  auto_renew BOOLEAN DEFAULT false,
  contract_value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT,
  sla_terms JSONB,
  terms_conditions TEXT,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.service_contracts(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  billing_frequency TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.contract_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.service_contracts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  generated_at TIMESTAMPTZ DEFAULT now(),
  due_date DATE
);

-- ============================================================================
-- SPRINT 7: Advanced Mobile Features
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action_data JSONB NOT NULL,
  created_offline_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending'
);

-- Add signature fields to work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS customer_signature_url TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS technician_signature_url TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- ============================================================================
-- SPRINT 8: Unified Notification System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  channel TEXT DEFAULT 'in_app',
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  template_key TEXT NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  channel TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, template_key, channel)
);

-- ============================================================================
-- SPRINT 9: Predictive Maintenance Engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  sensor_value NUMERIC NOT NULL,
  unit TEXT,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  status TEXT DEFAULT 'normal',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  failure_probability NUMERIC NOT NULL CHECK (failure_probability BETWEEN 0 AND 1),
  predicted_failure_date DATE,
  confidence_score NUMERIC,
  risk_level TEXT,
  recommended_action TEXT,
  contributing_factors JSONB,
  model_version TEXT,
  work_order_id UUID REFERENCES public.work_orders(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- SPRINT 10: Partner Portal & Commission System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  partner_number TEXT UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  partner_type TEXT DEFAULT 'reseller',
  status TEXT DEFAULT 'active',
  commission_rate NUMERIC DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  address JSONB,
  tax_id TEXT,
  bank_details JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  commission_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  base_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  partner_id UUID REFERENCES public.partners(id),
  rule_name TEXT NOT NULL,
  service_type TEXT,
  min_amount NUMERIC,
  max_amount NUMERIC,
  commission_percentage NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SPRINT 11: Document Intelligence & OCR
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  tenant_id UUID REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  document_number TEXT UNIQUE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  ocr_status TEXT DEFAULT 'pending',
  ocr_confidence NUMERIC,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence_score NUMERIC,
  field_type TEXT,
  bounding_box JSONB,
  page_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SPRINT 12: Webhook System & Integrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INTEGER,
  triggered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  integration_type TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  credentials JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, integration_type, integration_name)
);

-- ============================================================================
-- SPRINT 13: Calendar Integration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id UUID REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id),
  external_event_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  attendees JSONB DEFAULT '[]',
  sync_status TEXT DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own org" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = organizations.id)
);
CREATE POLICY "Admins manage orgs" ON public.organizations FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant customers" ON public.customers FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role])
);

-- Technicians
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant technicians" ON public.technicians FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins manage technicians" ON public.technicians FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role])
);

-- Equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant equipment" ON public.equipment FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins manage equipment" ON public.equipment FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role])
);

-- Service Contracts
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant contracts" ON public.service_contracts FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins manage contracts" ON public.service_contracts FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role])
);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "System creates notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant documents" ON public.documents FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users manage documents" ON public.documents FOR ALL USING (
  auth.role() = 'authenticated'
);

-- Webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage webhooks" ON public.webhooks FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- Service Requests (Customer Portal)
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own requests" ON public.service_requests FOR SELECT USING (
  customer_id IN (
    SELECT customer_id FROM public.customer_portal_access WHERE user_id = auth.uid()
  ) OR has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role])
);
CREATE POLICY "Customers create requests" ON public.service_requests FOR INSERT WITH CHECK (
  customer_id IN (
    SELECT customer_id FROM public.customer_portal_access WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_technicians_tenant ON public.technicians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_customer ON public.equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON public.equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_technician_locations_tech_time ON public.technician_locations(technician_id, timestamp DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON public.technicians 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_contracts_updated_at BEFORE UPDATE ON public.service_contracts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();