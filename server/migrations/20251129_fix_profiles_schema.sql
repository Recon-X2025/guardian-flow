-- Fix profiles table schema - Add missing columns
-- Generated: 2025-11-29

-- Add missing columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Create index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.country IS 'User country for localization and compliance';
COMMENT ON COLUMN profiles.tenant_id IS 'Multi-tenant isolation - links user to tenant';
COMMENT ON COLUMN profiles.currency IS 'User preferred currency (default: INR)';

