-- ============================================================
-- Guardian Flow: Client Role Extensions
-- Migration: 20251101130000
-- ============================================================

-- 1. Add client-specific roles to app_role enum
-- Using DO block to handle cases where values may already exist
DO $$ BEGIN
  -- Add client_admin role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_admin';
  END IF;
  
  -- Add client_operations_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_operations_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_operations_manager';
  END IF;
  
  -- Add client_finance_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_finance_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_finance_manager';
  END IF;
  
  -- Add client_compliance_officer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_compliance_officer' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_compliance_officer';
  END IF;
  
  -- Add client_procurement_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_procurement_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_procurement_manager';
  END IF;
  
  -- Add client_executive role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_executive' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_executive';
  END IF;
  
  -- Add client_fraud_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_fraud_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_fraud_manager';
  END IF;
END $$;

