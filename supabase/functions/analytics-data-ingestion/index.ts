import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'start_ingestion':
        result = await startIngestion(supabase, user.id, payload);
        break;
      case 'get_ingestion_status':
        result = await getIngestionStatus(supabase, payload.jobId);
        break;
      case 'list_ingestion_jobs':
        result = await listIngestionJobs(supabase, payload.workspaceId);
        break;
      case 'cancel_ingestion':
        result = await cancelIngestion(supabase, payload.jobId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-data-ingestion:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startIngestion(supabase: any, userId: string, payload: any) {
  const { dataSourceId, jobType, options } = payload;

  // Get data source details
  const { data: dataSource, error: sourceError } = await supabase
    .from('analytics_data_sources')
    .select('*, workspace:analytics_workspaces(*)')
    .eq('id', dataSourceId)
    .single();

  if (sourceError) throw sourceError;

  // Create ingestion job
  const { data: job, error: jobError } = await supabase
    .from('analytics_ingestion_jobs')
    .insert({
      workspace_id: dataSource.workspace_id,
      data_source_id: dataSourceId,
      job_type: jobType || 'batch',
      status: 'running',
      started_at: new Date().toISOString(),
      metadata: options || {}
    })
    .select()
    .single();

  if (jobError) throw jobError;

  // Log ingestion start
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: dataSource.workspace_id,
    p_event_type: 'ingestion_started',
    p_event_category: 'data_access',
    p_action: 'start',
    p_resource_type: 'ingestion_job',
    p_resource_id: job.id,
    p_metadata: { data_source_id: dataSourceId, job_type: jobType }
  });

  // Simulate ingestion process (in production this would trigger actual data ingestion)
  // For now, we'll just update the job status after a delay
  setTimeout(async () => {
    await completeIngestion(supabase, job.id, dataSource.workspace_id);
  }, 5000);

  return { job };
}

async function completeIngestion(supabase: any, jobId: string, workspaceId: string) {
  const recordsIngested = Math.floor(Math.random() * 10000) + 1000;
  const bytesProcessed = recordsIngested * 512;

  await supabase
    .from('analytics_ingestion_jobs')
    .update({
      status: 'success',
      completed_at: new Date().toISOString(),
      records_ingested: recordsIngested,
      bytes_processed: bytesProcessed
    })
    .eq('id', jobId);

  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'ingestion_completed',
    p_event_category: 'data_access',
    p_action: 'complete',
    p_resource_type: 'ingestion_job',
    p_resource_id: jobId,
    p_metadata: { records_ingested: recordsIngested, bytes_processed: bytesProcessed }
  });
}

async function getIngestionStatus(supabase: any, jobId: string) {
  const { data: job, error } = await supabase
    .from('analytics_ingestion_jobs')
    .select(`
      *,
      data_source:analytics_data_sources(name, source_type)
    `)
    .eq('id', jobId)
    .single();

  if (error) throw error;

  return { job };
}

async function listIngestionJobs(supabase: any, workspaceId: string) {
  const { data: jobs, error } = await supabase
    .from('analytics_ingestion_jobs')
    .select(`
      *,
      data_source:analytics_data_sources(name, source_type)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { jobs };
}

async function cancelIngestion(supabase: any, jobId: string) {
  const { data: job, error } = await supabase
    .from('analytics_ingestion_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select()
    .single();

  if (error) throw error;

  return { job };
}
