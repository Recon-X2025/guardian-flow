-- Allow authenticated users to view forecast models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='forecast_models' AND policyname='All authenticated view forecast models'
  ) THEN
    CREATE POLICY "All authenticated view forecast models"
    ON public.forecast_models
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- Ensure a unique model_key for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_forecast_models_model_key ON public.forecast_models (model_key);

-- Seed default active models if missing
INSERT INTO public.forecast_models (
  id, model_key, model_type, model_version, artifact_uri, metrics, hyperparams, training_data_range,
  features, active, created_at, updated_at, model_name, algorithm, frequency
)
SELECT gen_random_uuid(), 'engineer_shrinkage_default', 'engineer_shrinkage', 1, NULL, '{}'::jsonb, '{}'::jsonb, NULL,
       '[]'::jsonb, true, now(), now(), 'Engineer Shrinkage Default', 'naive', 'weekly'
WHERE NOT EXISTS (
  SELECT 1 FROM public.forecast_models WHERE model_key = 'engineer_shrinkage_default'
);

INSERT INTO public.forecast_models (
  id, model_key, model_type, model_version, artifact_uri, metrics, hyperparams, training_data_range,
  features, active, created_at, updated_at, model_name, algorithm, frequency
)
SELECT gen_random_uuid(), 'repair_volume_default', 'repair_volume', 1, NULL, '{}'::jsonb, '{}'::jsonb, NULL,
       '[]'::jsonb, true, now(), now(), 'Repair Volume Default', 'naive', 'daily'
WHERE NOT EXISTS (
  SELECT 1 FROM public.forecast_models WHERE model_key = 'repair_volume_default'
);

INSERT INTO public.forecast_models (
  id, model_key, model_type, model_version, artifact_uri, metrics, hyperparams, training_data_range,
  features, active, created_at, updated_at, model_name, algorithm, frequency
)
SELECT gen_random_uuid(), 'spend_revenue_default', 'spend_revenue', 1, NULL, '{}'::jsonb, '{}'::jsonb, NULL,
       '[]'::jsonb, true, now(), now(), 'Spend & Revenue Default', 'naive', 'daily'
WHERE NOT EXISTS (
  SELECT 1 FROM public.forecast_models WHERE model_key = 'spend_revenue_default'
);
