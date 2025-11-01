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
      case 'create': {
        const { workspace_id, name, description, pipeline_type = 'etl', source_config = {}, transformation_config = {}, destination_config = {} } = payload;
        const { data: pipeline, error } = await supabaseClient
          .from('analytics_pipelines')
          .insert({
            workspace_id,
            name,
            description,
            pipeline_type,
            source_config,
            transformation_config,
            destination_config,
            status: 'active',
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ pipeline }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_pipelines': {
        const { workspace_id } = payload;
        const { data: pipelines, error } = await supabaseClient
          .from('analytics_pipelines')
          .select('*')
          .eq('workspace_id', workspace_id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ pipelines }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'run': {
        const { pipeline_id } = payload;
        const { data: run, error: runError } = await supabaseClient
          .from('analytics_pipeline_runs')
          .insert({
            pipeline_id,
            status: 'running',
            started_at: new Date().toISOString(),
            triggered_by: user.id,
          })
          .select()
          .single();
        if (runError) throw runError;
        return new Response(JSON.stringify({ run }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'pause': {
        const { pipeline_id } = payload;
        const { data: pipeline, error } = await supabaseClient
          .from('analytics_pipelines')
          .update({ status: 'paused' })
          .eq('id', pipeline_id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ pipeline }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resume': {
        const { pipeline_id } = payload;
        const { data: pipeline, error } = await supabaseClient
          .from('analytics_pipelines')
          .update({ status: 'active' })
          .eq('id', pipeline_id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ pipeline }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_runs': {
        const { pipeline_id } = payload;
        const { data: runs, error } = await supabaseClient
          .from('analytics_pipeline_runs')
          .select('*')
          .eq('pipeline_id', pipeline_id)
          .order('started_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return new Response(JSON.stringify({ runs }), {
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
    console.error('Analytics pipeline executor error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
