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

    const { tenant_id } = await req.json();

    // Get latest seed info
    const { data: seedData, error: seedError } = await supabase
      .from('seed_info')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (seedError && seedError.code !== 'PGRST116') throw seedError;

    // Get forecast model metrics
    const { data: models, error: modelsError } = await supabase
      .from('forecast_models')
      .select('*')
      .eq('active', true)
      .order('last_trained_at', { ascending: false });

    if (modelsError) throw modelsError;

    // Get forecast queue status
    const { data: queueStats, error: queueError } = await supabase
      .from('forecast_queue')
      .select('status')
      .eq('tenant_id', tenant_id);

    if (queueError) throw queueError;

    const queueSummary = {
      queued: queueStats.filter(q => q.status === 'queued').length,
      processing: queueStats.filter(q => q.status === 'processing').length,
      completed: queueStats.filter(q => q.status === 'completed').length,
      failed: queueStats.filter(q => q.status === 'failed').length
    };

    // Get forecast output counts by type
    const { data: forecastCounts, error: fcError } = await supabase
      .from('forecast_outputs')
      .select('forecast_type, geography_level')
      .eq('tenant_id', tenant_id);

    if (fcError) throw fcError;

    const forecastSummary = {
      total: forecastCounts.length,
      by_type: forecastCounts.reduce((acc: any, f: any) => {
        acc[f.forecast_type] = (acc[f.forecast_type] || 0) + 1;
        return acc;
      }, {}),
      by_level: forecastCounts.reduce((acc: any, f: any) => {
        acc[f.geography_level] = (acc[f.geography_level] || 0) + 1;
        return acc;
      }, {})
    };

    // Calculate average model accuracy
    const avgAccuracy = models.length > 0
      ? models.reduce((sum, m) => sum + (m.accuracy_score || 0), 0) / models.length
      : 0;

    return new Response(
      JSON.stringify({
        seed_info: seedData || null,
        models: {
          total: models.length,
          average_accuracy: avgAccuracy.toFixed(2),
          models: models.map(m => ({
            id: m.id,
            name: m.model_name,
            type: m.model_type,
            hierarchy_level: m.hierarchy_level,
            accuracy: m.accuracy_score,
            last_trained: m.last_trained_at
          }))
        },
        queue: queueSummary,
        forecasts: forecastSummary,
        system_status: {
          data_seeded: !!seedData,
          models_trained: models.length > 0,
          forecasts_generated: forecastCounts.length > 0,
          ready: !!seedData && models.length > 0 && forecastCounts.length > 0
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
