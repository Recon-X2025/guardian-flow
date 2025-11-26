-- Initialize database schema
-- This replaces Supabase auth.users with a local users table

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'technician', 'customer');
CREATE TYPE ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE work_order_status AS ENUM ('draft', 'pending_validation', 'released', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE photo_role AS ENUM ('context_wide', 'pre_closeup', 'serial', 'replacement_part');
CREATE TYPE service_stage AS ENUM ('replacement', 'post_repair', 'pickup');

-- Users table (replaces auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  current_module_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Forecasting Engine Tables
CREATE TABLE IF NOT EXISTS forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL, -- 'engineer_shrinkage', 'repair_volume', 'spend_revenue'
  model_name TEXT NOT NULL,
  algorithm TEXT NOT NULL, -- 'prophet', 'lstm', 'xgboost', 'arima'
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  active BOOLEAN DEFAULT true,
  last_trained_at TIMESTAMPTZ,
  accuracy_score NUMERIC(5,2),
  config JSONB DEFAULT '{}'::jsonb,
  model_key TEXT UNIQUE,
  model_version INT DEFAULT 1,
  artifact_uri TEXT,
  metrics JSONB,
  hyperparams JSONB,
  training_data_range JSONB,
  hierarchy_level TEXT,
  product_scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecast_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES forecast_models(id),
  forecast_type TEXT NOT NULL,
  target_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  lower_bound NUMERIC,
  upper_bound NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  attributes JSONB,
  tenant_id UUID,
  product_id UUID,
  country TEXT,
  region TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  partner_hub TEXT,
  pin_code TEXT,
  geography_level TEXT,
  geography_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecast_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  trace_id UUID
);

CREATE TABLE IF NOT EXISTS forecast_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES forecast_models(id),
  forecast_date DATE NOT NULL,
  predicted_value NUMERIC NOT NULL,
  actual_value NUMERIC,
  error_pct NUMERIC,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Forecast indexes
CREATE INDEX IF NOT EXISTS idx_forecast_outputs_date ON forecast_outputs(target_date);
CREATE INDEX IF NOT EXISTS idx_forecast_outputs_type ON forecast_outputs(forecast_type);
CREATE INDEX IF NOT EXISTS idx_forecast_outputs_tenant_date ON forecast_outputs(tenant_id, target_date);
CREATE INDEX IF NOT EXISTS idx_forecast_hierarchical_lookup ON forecast_outputs(tenant_id, product_id, geography_level, geography_key, forecast_type, target_date);
CREATE INDEX IF NOT EXISTS idx_forecast_queue_status ON forecast_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_forecast_history_date ON forecast_history(forecast_date);

