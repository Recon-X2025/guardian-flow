-- Migration: Add Comprehensive Invoice Template Support
-- Date: November 25, 2025
-- Description: Adds support for GST-compliant comprehensive invoice structure

-- Add new enums for invoice types
DO $$ BEGIN
    CREATE TYPE invoice_type_enum AS ENUM ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_type_enum AS ENUM ('B2B', 'B2C');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tax_type_enum AS ENUM ('INTRA_STATE', 'INTER_STATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CARD', 'ONLINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comprehensive invoice data column (JSONB) to existing invoices table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        -- Add JSONB column for comprehensive invoice data
        ALTER TABLE public.invoices 
        ADD COLUMN IF NOT EXISTS invoice_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
        ADD COLUMN IF NOT EXISTS invoice_type invoice_type_enum DEFAULT 'TAX_INVOICE',
        ADD COLUMN IF NOT EXISTS supplier_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS customer_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS tax_summary_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS payment_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS transport_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS signatory_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS due_date DATE,
        ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'NET30',
        ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
        ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,4) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_export BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS eway_bill_required BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS po_number TEXT,
        ADD COLUMN IF NOT EXISTS job_card_number TEXT,
        ADD COLUMN IF NOT EXISTS project_code TEXT,
        ADD COLUMN IF NOT EXISTS department TEXT,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
    END IF;
END $$;

-- Create invoice_line_items table for detailed line items with HSN/SAC codes
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    line_number INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    hsn_sac TEXT,
    sac_is_service BOOLEAN DEFAULT false,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_type tax_type_enum,
    cgst_rate NUMERIC(5,2) DEFAULT 0,
    sgst_rate NUMERIC(5,2) DEFAULT 0,
    igst_rate NUMERIC(5,2) DEFAULT 0,
    cess_rate NUMERIC(5,2) DEFAULT 0,
    warranty_months INTEGER DEFAULT 0,
    supply_start_date DATE,
    supply_end_date DATE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_line_number CHECK (line_number > 0),
    CONSTRAINT valid_quantity CHECK (quantity >= 0),
    CONSTRAINT valid_rate CHECK (rate >= 0)
);

-- Create indexes for invoice_line_items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON public.invoice_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hsn_sac ON public.invoice_line_items(hsn_sac);

-- Create invoice_attachments table
CREATE TABLE IF NOT EXISTS public.invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    type TEXT NOT NULL CHECK (type IN ('PDF', 'IMAGE', 'OTHER')),
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_attachments_invoice_id ON public.invoice_attachments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_tenant_id ON public.invoice_attachments(tenant_id);

-- Create invoice_status_history table
CREATE TABLE IF NOT EXISTS public.invoice_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice_id ON public.invoice_status_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status_history_changed_at ON public.invoice_status_history(changed_at);

-- Create invoice_payment_transactions table (enhanced from payment_history)
CREATE TABLE IF NOT EXISTS public.invoice_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    transaction_id TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount NUMERIC(12,2) NOT NULL,
    method payment_method_enum,
    reference TEXT,
    status payment_status_enum DEFAULT 'UNPAID',
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_transactions_invoice_id ON public.invoice_payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_transactions_tenant_id ON public.invoice_payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_transactions_date ON public.invoice_payment_transactions(date);

-- Enable RLS on new tables
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_line_items
CREATE POLICY "Users can view invoice line items for their tenant"
    ON public.invoice_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_line_items.invoice_id
            AND (i.tenant_id = invoice_line_items.tenant_id OR invoice_line_items.tenant_id IS NULL)
        )
    );

CREATE POLICY "Managers can manage invoice line items"
    ON public.invoice_line_items FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- RLS Policies for invoice_attachments
CREATE POLICY "Users can view invoice attachments for their tenant"
    ON public.invoice_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_attachments.invoice_id
            AND (i.tenant_id = invoice_attachments.tenant_id OR invoice_attachments.tenant_id IS NULL)
        )
    );

CREATE POLICY "Managers can manage invoice attachments"
    ON public.invoice_attachments FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- RLS Policies for invoice_status_history
CREATE POLICY "Users can view invoice status history for their tenant"
    ON public.invoice_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_status_history.invoice_id
        )
    );

CREATE POLICY "Managers can manage invoice status history"
    ON public.invoice_status_history FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- RLS Policies for invoice_payment_transactions
CREATE POLICY "Users can view payment transactions for their tenant"
    ON public.invoice_payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_payment_transactions.invoice_id
            AND (i.tenant_id = invoice_payment_transactions.tenant_id OR invoice_payment_transactions.tenant_id IS NULL)
        )
    );

CREATE POLICY "Managers can manage payment transactions"
    ON public.invoice_payment_transactions FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_invoice_line_items_updated_at ON public.invoice_line_items;
CREATE TRIGGER update_invoice_line_items_updated_at
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

DROP TRIGGER IF EXISTS update_invoice_payment_transactions_updated_at ON public.invoice_payment_transactions;
CREATE TRIGGER update_invoice_payment_transactions_updated_at
    BEFORE UPDATE ON public.invoice_payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

-- Add GIN index on JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_data_gin ON public.invoices USING GIN (invoice_data);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_data_gin ON public.invoices USING GIN (supplier_data);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_data_gin ON public.invoices USING GIN (customer_data);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_summary_data_gin ON public.invoices USING GIN (tax_summary_data);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_data_gin ON public.invoices USING GIN (payment_data);

-- Add comment for documentation
COMMENT ON TABLE public.invoice_line_items IS 'Detailed line items for invoices with HSN/SAC codes and tax breakdown';
COMMENT ON TABLE public.invoice_attachments IS 'Attachments associated with invoices (PDFs, images, etc.)';
COMMENT ON TABLE public.invoice_status_history IS 'History of status changes for invoices';
COMMENT ON TABLE public.invoice_payment_transactions IS 'Payment transactions for invoices with detailed payment information';
COMMENT ON COLUMN public.invoices.invoice_data IS 'Comprehensive invoice data in JSONB format following the invoice template structure';

