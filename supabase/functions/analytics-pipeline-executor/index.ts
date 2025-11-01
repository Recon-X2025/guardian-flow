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
      case 'create_pipeline':
        result = await createPipeline(supabase, user.id, payload);
        break;
      case 'run_pipeline':
        result = await runPipeline(supabase, user.id, payload);
        break;
      case 'get_pipeline_status':
        result = await getPipelineStatus(supabase, payload.pipelineId);
        break;
      case 'list_pipelines':
        result = await listPipelines(supabase, payload.workspaceId);
        break;
      case 'get_pipeline_runs':
        result = await getPipelineRuns(supabase, payload.pipelineId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-pipeline-executor:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createPipeline(supabase: any, userId: string, payload: any) {
  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (!profile?.tenant_id) {
    throw new Error('User tenant not found');
  }

  const { data: pipeline, error } = await supabase
    .from('analytics_pipelines')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      pipeline_type: payload.pipeline_type,
      source_config: payload.source_config,
      transformation_steps: payload.transformation_steps,
      destination_config: payload.destination_config,
      schedule_cron: payload.schedule_cron,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: payload.workspace_id,
    p_event_type: 'pipeline_created',
    p_event_category: 'configuration',
    p_action: 'create',
    p_resource_type: 'pipeline',
    p_resource_id: pipeline.id,
    p_metadata: { pipeline_type: pipeline.pipeline_type }
  });

  return { pipeline };
}

async function runPipeline(supabase: any, userId: string, payload: any) {
  const { pipelineId } = payload;

  // Get pipeline details
  const { data: pipeline, error: pipelineError } = await supabase
    .from('analytics_pipelines')
    .select('*')
    .eq('id', pipelineId)
    .single();

  if (pipelineError) throw pipelineError;

  // Create pipeline run
  const { data: run, error: runError } = await supabase
    .from('analytics_pipeline_runs')
    .insert({
      pipeline_id: pipelineId,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (runError) throw runError;

  // Log pipeline execution start
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: pipeline.workspace_id,
    p_event_type: 'pipeline_started',
    p_event_category: 'data_access',
    p_action: 'execute',
    p_resource_type: 'pipeline',
    p_resource_id: pipelineId,
    p_metadata: { run_id: run.id }
  });

  // Simulate pipeline execution
  setTimeout(async () => {
    await completePipelineRun(supabase, run.id, pipeline.workspace_id, pipelineId);
  }, 8000);

  return { run };
}

async function completePipelineRun(supabase: any, runId: string, workspaceId: string, pipelineId: string) {
  const recordsProcessed = Math.floor(Math.random() * 50000) + 10000;
  const recordsTransformed = recordsProcessed;
  const recordsLoaded = Math.floor(recordsTransformed * 0.98);
  const recordsRejected = recordsTransformed - recordsLoaded;

  await supabase
    .from('analytics_pipeline_runs')
    .update({
      status: 'success',
      completed_at: new Date().toISOString(),
      records_processed: recordsProcessed,
      records_transformed: recordsTransformed,
      records_loaded: recordsLoaded,
      records_rejected: recordsRejected,
      metrics: {
        execution_time_ms: Math.floor(Math.random() * 5000) + 3000,
        success_rate: (recordsLoaded / recordsTransformed) * 100
      }
    })
    .eq('id', runId);

  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'pipeline_completed',
    p_event_category: 'data_access',
    p_action: 'complete',
    p_resource_type: 'pipeline',
    p_resource_id: pipelineId,
    p_metadata: { 
      run_id: runId,
      records_processed: recordsProcessed,
      records_loaded: recordsLoaded
    }
  });
}

async function getPipelineStatus(supabase: any, pipelineId: string) {
  const { data: pipeline, error } = await supabase
    .from('analytics_pipelines')
    .select(`
      *,
      latest_run:analytics_pipeline_runs(*)
    `)
    .eq('id', pipelineId)
    .single();

  if (error) throw error;

  return { pipeline };
}

async function listPipelines(supabase: any, workspaceId: string) {
  const { data: pipelines, error } = await supabase
    .from('analytics_pipelines')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { pipelines };
}

async function getPipelineRuns(supabase: any, pipelineId: string) {
  const { data: runs, error } = await supabase
    .from('analytics_pipeline_runs')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return { runs };
}
