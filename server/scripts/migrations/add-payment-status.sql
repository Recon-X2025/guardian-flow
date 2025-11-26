-- Migration: Add Payment Status Tracking to Invoices
-- Date: November 25, 2025
-- Sprint: Sprint 1 - Gap #3

-- Add payment_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE,
    quote_id UUID,
    work_order_id UUID,
    customer_id UUID,
    subtotal NUMERIC(10,2) NOT NULL,
    penalties NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'draft',
    hold_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add payment_status column to invoices table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_method TEXT;
    END IF;
END $$;

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    payment_amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT,
    payment_status payment_status NOT NULL,
    payment_reference TEXT,
    payment_date TIMESTAMPTZ DEFAULT now(),
    processed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON payment_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- Add trigger to update invoice payment_status when payment_history is inserted
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(12, 2);
    invoice_total NUMERIC(12, 2);
BEGIN
    -- Calculate total paid amount
    SELECT COALESCE(SUM(payment_amount), 0) INTO total_paid
    FROM payment_history
    WHERE invoice_id = NEW.invoice_id
    AND payment_status IN ('paid', 'partial');

    -- Get invoice total
    SELECT total_amount INTO invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice payment status based on total paid
    UPDATE invoices
    SET 
        payment_status = CASE
            WHEN total_paid >= invoice_total THEN 'paid'::payment_status
            WHEN total_paid > 0 THEN 'partial'::payment_status
            ELSE 'pending'::payment_status
        END,
        payment_received_at = CASE
            WHEN NEW.payment_status = 'paid' AND total_paid >= invoice_total THEN NEW.payment_date
            ELSE payment_received_at
        END,
        payment_amount = total_paid,
        updated_at = now()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON payment_history;
CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Add comment
COMMENT ON COLUMN invoices.payment_status IS 'Current payment status of the invoice';
COMMENT ON COLUMN invoices.payment_received_at IS 'Timestamp when payment was fully received';
COMMENT ON COLUMN invoices.payment_amount IS 'Total amount paid so far';
COMMENT ON TABLE payment_history IS 'Complete history of all payment transactions for invoices';

