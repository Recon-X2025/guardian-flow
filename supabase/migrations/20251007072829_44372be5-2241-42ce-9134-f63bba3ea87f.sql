-- Add forecast_queue for async job processing
CREATE TABLE IF NOT EXISTS public.forecast_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  payload jsonb NOT NULL,
  status text DEFAULT 'queued',
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  trace_id uuid
);

ALTER TABLE public.forecast_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System manages forecast queue"
ON public.forecast_queue
FOR ALL
USING (true);

-- Enhance forecast_models with ML metadata
ALTER TABLE public.forecast_models
ADD COLUMN IF NOT EXISTS model_key text UNIQUE,
ADD COLUMN IF NOT EXISTS model_version int DEFAULT 1,
ADD COLUMN IF NOT EXISTS artifact_uri text,
ADD COLUMN IF NOT EXISTS metrics jsonb,
ADD COLUMN IF NOT EXISTS hyperparams jsonb,
ADD COLUMN IF NOT EXISTS training_data_range jsonb;

-- Enhance forecast_outputs with confidence intervals
ALTER TABLE public.forecast_outputs
ADD COLUMN IF NOT EXISTS lower_bound numeric,
ADD COLUMN IF NOT EXISTS upper_bound numeric,
ADD COLUMN IF NOT EXISTS attributes jsonb;

-- Create index for job processing
CREATE INDEX IF NOT EXISTS idx_forecast_queue_status ON public.forecast_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_forecast_outputs_tenant_date ON public.forecast_outputs(tenant_id, target_date);