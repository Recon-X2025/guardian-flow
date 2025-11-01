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
      case 'create_workspace':
        result = await createWorkspace(supabase, user.id, payload);
        break;
      case 'get_workspaces':
        result = await getWorkspaces(supabase, user.id);
        break;
      case 'update_workspace':
        result = await updateWorkspace(supabase, user.id, payload);
        break;
      case 'archive_workspace':
        result = await archiveWorkspace(supabase, user.id, payload);
        break;
      case 'get_workspace_stats':
        result = await getWorkspaceStats(supabase, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-workspace-manager:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createWorkspace(supabase: any, userId: string, payload: any) {
  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (!profile?.tenant_id) {
    throw new Error('User tenant not found');
  }

  // Create workspace
  const { data: workspace, error } = await supabase
    .from('analytics_workspaces')
    .insert({
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      workspace_type: payload.workspace_type,
      storage_quota_gb: payload.storage_quota_gb || 1000,
      query_quota_per_day: payload.query_quota_per_day || 10000,
      metadata: payload.metadata || {},
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log workspace creation
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspace.id,
    p_event_type: 'workspace_created',
    p_event_category: 'configuration',
    p_action: 'create',
    p_resource_type: 'workspace',
    p_resource_id: workspace.id,
    p_metadata: { workspace_type: workspace.workspace_type }
  });

  return { workspace };
}

async function getWorkspaces(supabase: any, userId: string) {
  const { data: workspaces, error } = await supabase
    .from('analytics_workspaces')
    .select(`
      *,
      tenants(name),
      created_by_profile:profiles!analytics_workspaces_created_by_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { workspaces };
}

async function updateWorkspace(supabase: any, userId: string, payload: any) {
  const { workspaceId, ...updates } = payload;

  const { data: workspace, error } = await supabase
    .from('analytics_workspaces')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) throw error;

  // Log update
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'workspace_updated',
    p_event_category: 'configuration',
    p_action: 'update',
    p_resource_type: 'workspace',
    p_resource_id: workspaceId,
    p_metadata: updates
  });

  return { workspace };
}

async function archiveWorkspace(supabase: any, userId: string, payload: any) {
  const { workspaceId } = payload;

  const { data: workspace, error } = await supabase
    .from('analytics_workspaces')
    .update({ status: 'archived' })
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) throw error;

  // Log archival
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'workspace_archived',
    p_event_category: 'configuration',
    p_action: 'archive',
    p_resource_type: 'workspace',
    p_resource_id: workspaceId
  });

  return { workspace };
}

async function getWorkspaceStats(supabase: any, workspaceId: string) {
  // Get data source count
  const { count: dataSourceCount } = await supabase
    .from('analytics_data_sources')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  // Get catalog entries count
  const { count: datasetCount } = await supabase
    .from('analytics_data_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  // Get recent audit logs
  const { data: recentActivity } = await supabase
    .from('analytics_audit_logs')
    .select('event_type, action, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get storage usage (simulated for now)
  const { data: catalog } = await supabase
    .from('analytics_data_catalog')
    .select('size_bytes')
    .eq('workspace_id', workspaceId);

  const storageUsedBytes = catalog?.reduce((sum: number, item: any) => sum + (item.size_bytes || 0), 0) || 0;

  return {
    stats: {
      dataSourceCount: dataSourceCount || 0,
      datasetCount: datasetCount || 0,
      storageUsedBytes,
      recentActivity: recentActivity || [],
    }
  };
}
