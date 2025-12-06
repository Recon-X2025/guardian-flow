-- Create missing core tables (tickets, work_orders, invoices, stock_levels)
-- Generated: 2025-11-29

-- Check if these tables already exist before creating
-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id),
  tenant_id UUID,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Work Orders table (may already exist, but ensuring it has all needed columns)
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT UNIQUE NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  customer_id UUID REFERENCES users(id),
  tenant_id UUID,
  technician_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  work_order_id UUID REFERENCES work_orders(id),
  customer_id UUID REFERENCES users(id),
  tenant_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Levels table
CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID,
  tenant_id UUID,
  location_id UUID,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_ticket ON work_orders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(technician_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, due_date);

CREATE INDEX IF NOT EXISTS idx_stock_levels_item ON stock_levels(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant ON stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_location ON stock_levels(location_id);

-- Triggers for updated_at
CREATE TRIGGER update_tickets_updated_at 
  BEFORE UPDATE ON tickets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at 
  BEFORE UPDATE ON work_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at 
  BEFORE UPDATE ON stock_levels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

