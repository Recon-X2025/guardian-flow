import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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
      case 'create_endpoint':
        result = await createEndpoint(supabase, user.id, payload);
        break;
      case 'list_endpoints':
        result = await listEndpoints(supabase, payload.workspaceId);
        break;
      case 'get_endpoint_usage':
        result = await getEndpointUsage(supabase, payload.endpointId);
        break;
      case 'toggle_endpoint':
        result = await toggleEndpoint(supabase, payload.endpointId, payload.isActive);
        break;
      case 'execute_endpoint':
        result = await executeEndpoint(supabase, payload.endpointId, payload.parameters);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-api-gateway:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createEndpoint(supabase: any, userId: string, payload: any) {
  const { data: endpoint, error } = await supabase
    .from('analytics_api_endpoints')
    .insert({
      workspace_id: payload.workspace_id,
      endpoint_path: payload.endpoint_path,
      method: payload.method,
      query_id: payload.query_id,
      dashboard_id: payload.dashboard_id,
      rate_limit: payload.rate_limit || 1000,
      requires_auth: payload.requires_auth !== false,
      cache_ttl_seconds: payload.cache_ttl_seconds || 300,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { endpoint };
}

async function listEndpoints(supabase: any, workspaceId: string) {
  const { data: endpoints, error } = await supabase
    .from('analytics_api_endpoints')
    .select(`
      *,
      query:analytics_saved_queries(name),
      dashboard:analytics_dashboards(name),
      creator:profiles!analytics_api_endpoints_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { endpoints };
}

async function getEndpointUsage(supabase: any, endpointId: string) {
  const { data: usage, error } = await supabase
    .from('analytics_api_usage')
    .select('*')
    .eq('endpoint_id', endpointId)
    .order('request_timestamp', { ascending: false })
    .limit(1000);

  if (error) throw error;

  // Calculate stats
  const totalRequests = usage.length;
  const avgResponseTime = usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / totalRequests;
  const errorRate = usage.filter(u => u.status_code >= 400).length / totalRequests;

  return { 
    usage,
    stats: {
      total_requests: totalRequests,
      avg_response_time_ms: avgResponseTime,
      error_rate: errorRate
    }
  };
}

async function toggleEndpoint(supabase: any, endpointId: string, isActive: boolean) {
  const { data: endpoint, error } = await supabase
    .from('analytics_api_endpoints')
    .update({ is_active: isActive })
    .eq('id', endpointId)
    .select()
    .single();

  if (error) throw error;

  return { endpoint };
}

async function executeEndpoint(supabase: any, endpointId: string, parameters: any) {
  const startTime = Date.now();

  // Get endpoint details
  const { data: endpoint } = await supabase
    .from('analytics_api_endpoints')
    .select('*, workspace:analytics_workspaces(*)')
    .eq('id', endpointId)
    .single();

  if (!endpoint || !endpoint.is_active) {
    throw new Error('Endpoint not found or inactive');
  }

  // Simulate query execution (in production, this would execute actual query)
  const mockResults = {
    data: [
      { id: 1, metric: 'Revenue', value: 125000 },
      { id: 2, metric: 'Users', value: 5430 },
      { id: 3, metric: 'Conversion', value: 3.2 }
    ],
    metadata: {
      rows_returned: 3,
      execution_time_ms: Date.now() - startTime
    }
  };

  // Log usage
  await supabase
    .from('analytics_api_usage')
    .insert({
      endpoint_id: endpointId,
      workspace_id: endpoint.workspace_id,
      response_time_ms: Date.now() - startTime,
      status_code: 200,
      client_ip: '0.0.0.0',
      user_agent: 'Analytics API Client'
    });

  return mockResults;
}
