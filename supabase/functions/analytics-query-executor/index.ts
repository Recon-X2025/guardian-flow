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
      case 'execute_query':
        result = await executeQuery(supabase, user.id, payload);
        break;
      case 'save_query':
        result = await saveQuery(supabase, user.id, payload);
        break;
      case 'get_saved_queries':
        result = await getSavedQueries(supabase, payload.workspaceId);
        break;
      case 'get_query_history':
        result = await getQueryHistory(supabase, user.id, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-query-executor:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeQuery(supabase: any, userId: string, payload: any) {
  const { workspaceId, queryText, parameters } = payload;

  const startTime = Date.now();

  // Simulate query execution (in production, this would execute actual analytical queries)
  const mockResults = generateMockQueryResults();
  
  const executionTime = Date.now() - startTime;

  // Log query execution
  await supabase
    .from('analytics_query_history')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      query_text: queryText,
      execution_time_ms: executionTime,
      rows_returned: mockResults.length,
      bytes_scanned: mockResults.length * 256,
      status: 'success'
    });

  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'query_executed',
    p_event_category: 'query_execution',
    p_action: 'execute',
    p_resource_type: 'query',
    p_resource_id: null,
    p_metadata: { 
      execution_time_ms: executionTime,
      rows_returned: mockResults.length
    }
  });

  return { 
    results: mockResults,
    execution_time_ms: executionTime,
    rows_returned: mockResults.length
  };
}

function generateMockQueryResults(): any[] {
  const count = Math.floor(Math.random() * 50) + 10;
  const results = [];
  
  for (let i = 0; i < count; i++) {
    results.push({
      id: i + 1,
      metric: `Metric ${i + 1}`,
      value: Math.floor(Math.random() * 10000),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }
  
  return results;
}

async function saveQuery(supabase: any, userId: string, payload: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const { data: query, error } = await supabase
    .from('analytics_saved_queries')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      query_text: payload.query_text,
      query_type: payload.query_type || 'sql',
      parameters: payload.parameters || {},
      is_public: payload.is_public || false,
      folder_path: payload.folder_path,
      tags: payload.tags || [],
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { query };
}

async function getSavedQueries(supabase: any, workspaceId: string) {
  const { data: queries, error } = await supabase
    .from('analytics_saved_queries')
    .select(`
      *,
      creator:profiles!analytics_saved_queries_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { queries };
}

async function getQueryHistory(supabase: any, userId: string, workspaceId: string) {
  const { data: history, error } = await supabase
    .from('analytics_query_history')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { history };
}
