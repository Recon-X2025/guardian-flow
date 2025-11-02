-- ============================================================
-- Guardian Flow: Industry Terminology Engine
-- Migration: 20251101163000
-- ============================================================
-- This migration enables dynamic terminology switching by industry
-- Users can switch between generic terms like "Work Order" to industry-specific
-- terms like "Service Call", "Ticket", "Job", etc.

-- 1. Create industry_terminology table
CREATE TABLE IF NOT EXISTS public.industry_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  plural_form TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry_type, entity_type)
);

-- 2. Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_industry_terminology_lookup 
ON public.industry_terminology(industry_type, entity_type);

-- 3. Create tenant_terminology_preferences table
CREATE TABLE IF NOT EXISTS public.tenant_terminology_preferences (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  preferred_industry TEXT NOT NULL,
  custom_overrides JSONB DEFAULT '{}',
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Insert default terminology for each industry

-- Generic/Default (FSM) terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('generic', 'work_order', 'Work Order', 'Work Orders', 'A request for field service work'),
('generic', 'technician', 'Technician', 'Technicians', 'Field service technician'),
('generic', 'customer', 'Customer', 'Customers', 'Service recipient'),
('generic', 'site', 'Site', 'Sites', 'Service location'),
('generic', 'asset', 'Asset', 'Assets', 'Equipment or property being serviced'),
('generic', 'ticket', 'Ticket', 'Tickets', 'Service request ticket'),
('generic', 'invoice', 'Invoice', 'Invoices', 'Billing document'),
('generic', 'dispatch', 'Dispatch', 'Dispatch', 'Assignment of work to technician'),
('generic', 'quota', 'Quota', 'Quotas', 'Performance target'),
('generic', 'penalty', 'Penalty', 'Penalties', 'SLA violation charge')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Healthcare terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('healthcare', 'work_order', 'Service Call', 'Service Calls', 'Medical equipment service request'),
('healthcare', 'technician', 'Biomedical Engineer', 'Biomedical Engineers', 'Medical equipment technician'),
('healthcare', 'customer', 'Healthcare Facility', 'Healthcare Facilities', 'Hospital, clinic, or medical center'),
('healthcare', 'site', 'Department', 'Departments', 'Medical department location'),
('healthcare', 'asset', 'Medical Device', 'Medical Devices', 'Surgical or diagnostic equipment'),
('healthcare', 'ticket', 'Service Request', 'Service Requests', 'Maintenance or repair request'),
('healthcare', 'invoice', 'Service Charge', 'Service Charges', 'Billing for medical equipment service'),
('healthcare', 'dispatch', 'Assignment', 'Assignments', 'Assign engineer to equipment service'),
('healthcare', 'quota', 'Target', 'Targets', 'Performance objective'),
('healthcare', 'penalty', 'SLA Breach', 'SLA Breaches', 'Response time violation charge')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Manufacturing terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('manufacturing', 'work_order', 'Maintenance Order', 'Maintenance Orders', 'Production equipment maintenance request'),
('manufacturing', 'technician', 'Maintenance Engineer', 'Maintenance Engineers', 'Factory maintenance specialist'),
('manufacturing', 'customer', 'Plant', 'Plants', 'Manufacturing facility'),
('manufacturing', 'site', 'Production Line', 'Production Lines', 'Assembly or processing line'),
('manufacturing', 'asset', 'Production Asset', 'Production Assets', 'Machinery or equipment'),
('manufacturing', 'ticket', 'Maintenance Request', 'Maintenance Requests', 'Equipment repair or service ticket'),
('manufacturing', 'invoice', 'Service Order', 'Service Orders', 'Maintenance service billing'),
('manufacturing', 'dispatch', 'Assign', 'Assignments', 'Assign engineer to maintenance task'),
('manufacturing', 'quota', 'Target', 'Targets', 'Performance metric'),
('manufacturing', 'penalty', 'Downtime Charge', 'Downtime Charges', 'Production line impact charge')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Utilities/Energy terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('utilities', 'work_order', 'Service Request', 'Service Requests', 'Utility infrastructure service'),
('utilities', 'technician', 'Field Technician', 'Field Technicians', 'Power or utility technician'),
('utilities', 'customer', 'Subscriber', 'Subscribers', 'Utility account holder'),
('utilities', 'site', 'Service Location', 'Service Locations', 'Meter or infrastructure location'),
('utilities', 'asset', 'Infrastructure', 'Infrastructure', 'Power lines, meters, equipment'),
('utilities', 'ticket', 'Service Ticket', 'Service Tickets', 'Outage or service request'),
('utilities', 'invoice', 'Service Bill', 'Service Bills', 'Utility service charge'),
('utilities', 'dispatch', 'Deploy', 'Deployments', 'Send technician to location'),
('utilities', 'quota', 'Metric', 'Metrics', 'Performance indicator'),
('utilities', 'penalty', 'Outage Charge', 'Outage Charges', 'Service interruption penalty')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Logistics/Transportation terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('logistics', 'work_order', 'Delivery Job', 'Delivery Jobs', 'Transportation or delivery assignment'),
('logistics', 'technician', 'Driver', 'Drivers', 'Delivery or transport driver'),
('logistics', 'customer', 'Shipper', 'Shippers', 'Shipping client'),
('logistics', 'site', 'Location', 'Locations', 'Pickup or delivery address'),
('logistics', 'asset', 'Vehicle', 'Vehicles', 'Truck, van, or delivery vehicle'),
('logistics', 'ticket', 'Shipment', 'Shipments', 'Delivery order'),
('logistics', 'invoice', 'Freight Bill', 'Freight Bills', 'Shipping charge'),
('logistics', 'dispatch', 'Route', 'Routes', 'Assign driver to delivery'),
('logistics', 'quota', 'Target', 'Targets', 'Performance goal'),
('logistics', 'penalty', 'Delay Charge', 'Delay Charges', 'Late delivery penalty')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Finance/Insurance terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('finance', 'work_order', 'Claim Assignment', 'Claim Assignments', 'Insurance claim investigation'),
('finance', 'technician', 'Adjuster', 'Adjusters', 'Claims adjuster or investigator'),
('finance', 'customer', 'Policyholder', 'Policyholders', 'Insurance customer'),
('finance', 'site', 'Claim Location', 'Claim Locations', 'Property or incident site'),
('finance', 'asset', 'Property', 'Properties', 'Insured property or asset'),
('finance', 'ticket', 'Claim', 'Claims', 'Insurance claim file'),
('finance', 'invoice', 'Estimate', 'Estimates', 'Damage assessment and billing'),
('finance', 'dispatch', 'Assign', 'Assignments', 'Assign adjuster to claim'),
('finance', 'quota', 'Target', 'Targets', 'Performance objective'),
('finance', 'penalty', 'Fee', 'Fees', 'Service charge or penalty')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- IT/Technology terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('it', 'work_order', 'Support Ticket', 'Support Tickets', 'IT service request'),
('it', 'technician', 'Support Engineer', 'Support Engineers', 'IT support technician'),
('it', 'customer', 'Client', 'Clients', 'Technology client or user'),
('it', 'site', 'Location', 'Locations', 'Office or data center location'),
('it', 'asset', 'Device', 'Devices', 'Computer, server, or network equipment'),
('it', 'ticket', 'Incident', 'Incidents', 'IT service incident'),
('it', 'invoice', 'Service Charge', 'Service Charges', 'IT support billing'),
('it', 'dispatch', 'Assign', 'Assignments', 'Assign engineer to ticket'),
('it', 'quota', 'KPI', 'KPIs', 'Key performance indicator'),
('it', 'penalty', 'Service Credit', 'Service Credits', 'SLA violation credit')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- Retail terminology
INSERT INTO public.industry_terminology (industry_type, entity_type, display_name, plural_form, description) VALUES
('retail', 'work_order', 'Service Request', 'Service Requests', 'Retail equipment or facility service'),
('retail', 'technician', 'Service Tech', 'Service Techs', 'Retail service technician'),
('retail', 'customer', 'Store', 'Stores', 'Retail location or franchisee'),
('retail', 'site', 'Location', 'Locations', 'Store or warehouse location'),
('retail', 'asset', 'Equipment', 'Equipment', 'POS, HVAC, or store equipment'),
('retail', 'ticket', 'Request', 'Requests', 'Equipment service request'),
('retail', 'invoice', 'Service Charge', 'Service Charges', 'Store service billing'),
('retail', 'dispatch', 'Assign', 'Assignments', 'Assign tech to location'),
('retail', 'quota', 'Target', 'Targets', 'Performance metric'),
('retail', 'penalty', 'Charge', 'Charges', 'Service penalty charge')
ON CONFLICT (industry_type, entity_type) DO NOTHING;

-- 5. Create helper function to get terminology
CREATE OR REPLACE FUNCTION public.get_terminology(
  _industry_type TEXT,
  _entity_type TEXT
) RETURNS JSONB LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT jsonb_build_object(
    'display_name', display_name,
    'plural_form', plural_form,
    'description', description
  )
  FROM public.industry_terminology
  WHERE industry_type = _industry_type
    AND entity_type = _entity_type
    AND is_active = true
  LIMIT 1
$$;

-- 6. Create function to get all terminology for an industry
CREATE OR REPLACE FUNCTION public.get_industry_terminology(
  _industry_type TEXT
) RETURNS JSONB LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT jsonb_object_agg(
    entity_type,
    jsonb_build_object(
      'display_name', display_name,
      'plural_form', plural_form,
      'description', description
    )
  )
  FROM public.industry_terminology
  WHERE industry_type = _industry_type
    AND is_active = true
$$;

-- 7. Enable RLS on new tables
ALTER TABLE public.industry_terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_terminology_preferences ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Everyone can read terminology (it's public configuration)
CREATE POLICY "Anyone can view terminology" ON public.industry_terminology
  FOR SELECT USING (true);

-- Only sys_admins can manage terminology
CREATE POLICY "Admins manage terminology" ON public.industry_terminology
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role])
  );

-- Tenants can view and update their own preferences
CREATE POLICY "Tenants view own preferences" ON public.tenant_terminology_preferences
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant admins update preferences" ON public.tenant_terminology_preferences
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
  );

-- 9. Add updated_at trigger for industry_terminology
CREATE OR REPLACE FUNCTION public.update_industry_terminology_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_industry_terminology_timestamp
BEFORE UPDATE ON public.industry_terminology
FOR EACH ROW
EXECUTE FUNCTION public.update_industry_terminology_timestamp();

-- 10. Add updated_at trigger for tenant_terminology_preferences
CREATE OR REPLACE FUNCTION public.update_terminology_preferences_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_terminology_preferences_timestamp
BEFORE UPDATE ON public.tenant_terminology_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_terminology_preferences_timestamp();

-- 11. Add comment for documentation
COMMENT ON TABLE public.industry_terminology IS 
'Stores industry-specific terminology mappings. Allows dynamic switching between
generic terms (Work Order, Technician) and industry-specific terms (Service Call,
Biomedical Engineer, etc.)';

COMMENT ON TABLE public.tenant_terminology_preferences IS
'Stores tenant preferences for terminology display. Tenants can customize
terminology beyond the default industry template.';

COMMENT ON FUNCTION public.get_terminology(TEXT, TEXT) IS
'Helper function to get single terminology entry by industry and entity type.';

COMMENT ON FUNCTION public.get_industry_terminology(TEXT) IS
'Get all terminology for a given industry type in JSON format.';

-- ============================================================
-- COMPLETION NOTES
-- ============================================================
-- This migration creates the foundation for dynamic industry terminology.
-- Next steps:
-- 1. Create React context/hook to use this terminology in UI
-- 2. Build UI switcher component for changing industry on-the-fly
-- 3. Apply terminology to all UI text displays
-- 4. Support custom tenant overrides

