-- Fix security definer view issue by dropping and recreating without security definer
DROP VIEW IF EXISTS public.trace_spans;

-- Create view without security definer (uses invoker's permissions)
CREATE VIEW public.trace_spans AS
  SELECT 
    id,
    trace_id,
    span_id,
    parent_span_id,
    start_time,
    end_time,
    duration_ms,
    attributes,
    events,
    created_at,
    operation_name,
    agent_id,
    service_name,
    status,
    error_message
  FROM public.observability_traces;
