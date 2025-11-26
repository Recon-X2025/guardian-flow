-- Migration: Payment Gateway Configuration Tables
-- Date: November 25, 2025
-- Feature: Multi-Gateway Payment System

-- Payment Gateway Providers Enum
DO $$ BEGIN
    CREATE TYPE payment_gateway_provider AS ENUM ('stripe', 'razorpay', 'paypal', 'square', 'manual', 'bank_transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Gateway Configuration Table
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider payment_gateway_provider NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    test_mode BOOLEAN DEFAULT true,
    credentials JSONB DEFAULT '{}'::jsonb, -- Encrypted credentials
    webhook_secret TEXT,
    webhook_url TEXT,
    supported_currencies TEXT[] DEFAULT ARRAY['USD'],
    supported_payment_methods TEXT[] DEFAULT ARRAY['card'],
    fees_config JSONB DEFAULT '{"percentage": 0, "fixed": 0}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    tenant_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(provider, tenant_id)
);

-- Payment Transactions Table (enhanced)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    gateway_provider payment_gateway_provider NOT NULL,
    gateway_transaction_id TEXT, -- External gateway transaction ID
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT, -- 'card', 'netbanking', 'upi', 'wallet', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'refunded'
    gateway_response JSONB DEFAULT '{}'::jsonb,
    customer_id UUID,
    customer_email TEXT,
    customer_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Gateway Webhooks Log
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_provider payment_gateway_provider NOT NULL,
    webhook_id TEXT,
    event_type TEXT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_enabled ON payment_gateways(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(gateway_provider, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_provider ON payment_webhook_logs(gateway_provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_processed ON payment_webhook_logs(processed);

-- Insert default gateway configurations (disabled by default)
INSERT INTO payment_gateways (provider, name, description, enabled, test_mode, supported_currencies, supported_payment_methods) VALUES
    ('stripe', 'Stripe', 'Stripe payment gateway - Global coverage, full PCI compliance', false, true, ARRAY['USD', 'EUR', 'GBP', 'INR'], ARRAY['card']),
    ('razorpay', 'Razorpay', 'Razorpay payment gateway - Popular in India, supports UPI, cards, wallets', false, true, ARRAY['INR'], ARRAY['card', 'netbanking', 'upi', 'wallet']),
    ('paypal', 'PayPal', 'PayPal payment gateway - Widely recognized, supports PayPal accounts', false, true, ARRAY['USD', 'EUR', 'GBP'], ARRAY['paypal', 'card']),
    ('manual', 'Manual Payment', 'Manual payment processing (check, wire transfer, etc.)', true, false, ARRAY['USD', 'EUR', 'INR'], ARRAY['manual']),
    ('bank_transfer', 'Bank Transfer', 'Direct bank transfer/ACH payments', true, false, ARRAY['USD', 'EUR', 'INR'], ARRAY['ach', 'wire'])
ON CONFLICT DO NOTHING;

-- Update invoices table to link with transactions
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS gateway_provider payment_gateway_provider,
    ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL;

-- Add indexes for invoice payment tracking
CREATE INDEX IF NOT EXISTS idx_invoices_gateway ON invoices(gateway_provider);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction ON invoices(payment_transaction_id);

