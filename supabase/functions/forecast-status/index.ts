import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const correlationId = url.searchParams.get('correlation_id');

    // Get queue status
    let queueQuery = supabase
      .from('forecast_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (correlationId) {
      queueQuery = queueQuery.eq('trace_id', correlationId);
    }

    const { data: queueJobs } = await queueQuery.limit(50);

    // Get recent forecast outputs
    const { data: recentForecasts } = await supabase
      .from('forecast_outputs')
      .select('forecast_type, geography_level, target_date, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    // Get active models
    const { data: models } = await supabase
      .from('forecast_models')
      .select('*')
      .eq('active', true);

    // Calculate statistics
    const stats = {
      queue: {
        total: queueJobs?.length || 0,
        queued: queueJobs?.filter(j => j.status === 'queued').length || 0,
        processing: queueJobs?.filter(j => j.status === 'processing').length || 0,
        completed: queueJobs?.filter(j => j.status === 'completed').length || 0,
        failed: queueJobs?.filter(j => j.status === 'failed').length || 0
      },
      forecasts: {
        last_24h: recentForecasts?.length || 0,
        by_level: {} as Record<string, number>,
        by_type: {} as Record<string, number>
      },
      models: {
        active: models?.length || 0,
        by_type: {} as Record<string, number>
      }
    };

    // Group forecasts by level and type
    recentForecasts?.forEach(f => {
      stats.forecasts.by_level[f.geography_level] = (stats.forecasts.by_level[f.geography_level] || 0) + 1;
      stats.forecasts.by_type[f.forecast_type] = (stats.forecasts.by_type[f.forecast_type] || 0) + 1;
    });

    // Group models by type
    models?.forEach(m => {
      stats.models.by_type[m.model_type] = (stats.models.by_type[m.model_type] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
        stats,
        recent_jobs: queueJobs?.slice(0, 10),
        models
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('forecast-status error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});