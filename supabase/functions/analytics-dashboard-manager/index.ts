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
      case 'create_dashboard':
        result = await createDashboard(supabase, user.id, payload);
        break;
      case 'get_dashboard':
        result = await getDashboard(supabase, payload.dashboardId);
        break;
      case 'list_dashboards':
        result = await listDashboards(supabase, payload.workspaceId);
        break;
      case 'add_widget':
        result = await addWidget(supabase, payload);
        break;
      case 'update_widget':
        result = await updateWidget(supabase, payload);
        break;
      case 'delete_widget':
        result = await deleteWidget(supabase, payload.widgetId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-dashboard-manager:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createDashboard(supabase: any, userId: string, payload: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const { data: dashboard, error } = await supabase
    .from('analytics_dashboards')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      layout: payload.layout || [],
      filters: payload.filters || {},
      refresh_interval_seconds: payload.refresh_interval_seconds,
      is_public: payload.is_public || false,
      folder_path: payload.folder_path,
      tags: payload.tags || [],
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { dashboard };
}

async function getDashboard(supabase: any, dashboardId: string) {
  const { data: dashboard, error } = await supabase
    .from('analytics_dashboards')
    .select(`
      *,
      widgets:analytics_dashboard_widgets(*)
    `)
    .eq('id', dashboardId)
    .single();

  if (error) throw error;

  return { dashboard };
}

async function listDashboards(supabase: any, workspaceId: string) {
  const { data: dashboards, error } = await supabase
    .from('analytics_dashboards')
    .select(`
      *,
      creator:profiles!analytics_dashboards_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { dashboards };
}

async function addWidget(supabase: any, payload: any) {
  const { data: widget, error } = await supabase
    .from('analytics_dashboard_widgets')
    .insert({
      dashboard_id: payload.dashboard_id,
      widget_type: payload.widget_type,
      chart_type: payload.chart_type,
      query_id: payload.query_id,
      query_text: payload.query_text,
      configuration: payload.configuration || {},
      position: payload.position
    })
    .select()
    .single();

  if (error) throw error;

  return { widget };
}

async function updateWidget(supabase: any, payload: any) {
  const { widgetId, ...updates } = payload;

  const { data: widget, error } = await supabase
    .from('analytics_dashboard_widgets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', widgetId)
    .select()
    .single();

  if (error) throw error;

  return { widget };
}

async function deleteWidget(supabase: any, widgetId: string) {
  const { error } = await supabase
    .from('analytics_dashboard_widgets')
    .delete()
    .eq('id', widgetId);

  if (error) throw error;

  return { success: true };
}
