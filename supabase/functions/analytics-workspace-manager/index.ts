import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, payload } = await req.json();

    switch (action) {
      case 'list': {
        const { data: workspaces, error } = await supabaseClient
          .from('analytics_workspaces')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ workspaces }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        const { name, description, workspace_type = 'custom', storage_quota_gb = 1000, query_quota_per_day = 10000 } = payload || {};

        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        const { data: workspace, error } = await supabaseClient
          .from('analytics_workspaces')
          .insert({
            name,
            description,
            workspace_type,
            storage_quota_gb,
            query_quota_per_day,
            tenant_id: profile?.tenant_id ?? null,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ workspace }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Analytics workspace manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
