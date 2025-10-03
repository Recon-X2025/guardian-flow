-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'technician', 'customer');
CREATE TYPE ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE work_order_status AS ENUM ('draft', 'pending_validation', 'released', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE photo_role AS ENUM ('context_wide', 'pre_closeup', 'serial', 'replacement_part');
CREATE TYPE service_stage AS ENUM ('replacement', 'post_repair', 'pickup');

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  unit_serial TEXT NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  site_address TEXT,
  symptom TEXT NOT NULL,
  status ticket_status DEFAULT 'open',
  provisional_sla INTERVAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  wo_number TEXT UNIQUE,
  status work_order_status DEFAULT 'draft',
  technician_id UUID REFERENCES auth.users(id),
  hub_id UUID,
  warranty_checked BOOLEAN DEFAULT false,
  warranty_result JSONB,
  parts_reserved BOOLEAN DEFAULT false,
  cost_to_customer NUMERIC(12, 2) DEFAULT 0,
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  consumable BOOLEAN DEFAULT false,
  lead_time_days INTEGER DEFAULT 0,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock levels table
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  hub_id UUID,
  location TEXT DEFAULT 'main',
  qty_available INTEGER DEFAULT 0,
  qty_reserved INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, hub_id, location)
);

-- Warranty records table
CREATE TABLE public.warranty_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_serial TEXT UNIQUE NOT NULL,
  model TEXT,
  warranty_start DATE NOT NULL,
  warranty_end DATE NOT NULL,
  terms_json JSONB,
  coverage_type TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments table (for photo enforcement)
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id),
  bucket_url TEXT,
  filename TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  role photo_role,
  stage service_stage,
  gps_lat NUMERIC(10, 8),
  gps_lon NUMERIC(11, 8),
  captured_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photo validations table
CREATE TABLE public.photo_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  stage service_stage NOT NULL,
  photos_validated BOOLEAN DEFAULT false,
  validation_result JSONB,
  validated_by UUID REFERENCES auth.users(id),
  override_reason TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Service orders table
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  so_number TEXT UNIQUE,
  html_content TEXT,
  pdf_url TEXT,
  template_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Penalty matrix table
CREATE TABLE public.penalty_matrix (
  id SERIAL PRIMARY KEY,
  penalty_code TEXT UNIQUE NOT NULL,
  violation_type TEXT NOT NULL,
  description TEXT,
  calculation_method TEXT DEFAULT 'percentage',
  percentage_value NUMERIC(5, 2) NOT NULL,
  base_reference TEXT NOT NULL,
  rate_card_entry_code TEXT,
  severity_level TEXT NOT NULL,
  auto_bill BOOLEAN DEFAULT false,
  dispute_allowed BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_matrix ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranty_records_updated_at BEFORE UPDATE ON public.warranty_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for tickets
CREATE POLICY "All authenticated users can view tickets" ON public.tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can create tickets" ON public.tickets FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));
CREATE POLICY "Managers and admins can update tickets" ON public.tickets FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- RLS Policies for work_orders
CREATE POLICY "All authenticated users can view work orders" ON public.work_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can manage work orders" ON public.work_orders FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));
CREATE POLICY "Technicians can update assigned work orders" ON public.work_orders FOR UPDATE USING (auth.uid() = technician_id AND public.has_role(auth.uid(), 'technician'));

-- RLS Policies for inventory
CREATE POLICY "All authenticated users can view inventory" ON public.inventory_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage inventory items" ON public.inventory_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view stock levels" ON public.stock_levels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can update stock" ON public.stock_levels FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- RLS Policies for warranty
CREATE POLICY "All authenticated users can view warranty records" ON public.warranty_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage warranty records" ON public.warranty_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attachments
CREATE POLICY "All authenticated users can view attachments" ON public.attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Technicians can upload attachments" ON public.attachments FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['technician', 'manager', 'admin']::app_role[]));

-- RLS Policies for photo validations
CREATE POLICY "All authenticated users can view validations" ON public.photo_validations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can create validations" ON public.photo_validations FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['manager', 'admin']::app_role[]));

-- RLS Policies for service orders
CREATE POLICY "All authenticated users can view service orders" ON public.service_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can create service orders" ON public.service_orders FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['manager', 'admin']::app_role[]));

-- RLS Policies for penalty matrix
CREATE POLICY "All authenticated users can view penalties" ON public.penalty_matrix FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage penalties" ON public.penalty_matrix FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample penalty matrix data
INSERT INTO public.penalty_matrix (penalty_code, violation_type, description, percentage_value, base_reference, severity_level) VALUES
('PEN_SKILL_UNCERT', 'Skill', 'Uncertified engineer worked on WO', 50, 'wo_payout', 'critical'),
('PEN_SLA_BREACH', 'SLA', 'Missed SLA commitment', 20, 'wo_payout', 'high'),
('PEN_CAPACITY_OVERUSE', 'Capacity', 'Partner exceeded WO concurrency', 10, 'wo_payout', 'low'),
('PEN_PARTS_UNAUTHORIZED', 'Parts', 'Unauthorized part usage', 30, 'spare_cost', 'medium'),
('PEN_DATA_BREACH', 'Compliance', 'Data security breach', 100, 'wo_payout', 'critical');

-- Insert sample inventory items
INSERT INTO public.inventory_items (sku, description, consumable, unit_price) VALUES
('HVAC-FILTER-001', 'HVAC Air Filter Standard', true, 15.99),
('HVAC-MOTOR-001', 'HVAC Blower Motor', false, 299.99),
('ELEC-PANEL-001', 'Electrical Panel 100A', false, 450.00),
('PLMB-VALVE-001', 'Shut-off Valve 1/2 inch', false, 12.50);

-- Insert sample warranty records
INSERT INTO public.warranty_records (unit_serial, model, warranty_start, warranty_end) VALUES
('HVAC-12345-XYZ', 'HVAC-Pro-3000', '2024-01-01', '2027-01-01'),
('ELEC-67890-ABC', 'Panel-Master-200', '2023-06-15', '2026-06-15');

-- Generate WO number function
CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'WO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0')
  INTO new_number
  FROM public.work_orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  RETURN new_number;
END;
$$;