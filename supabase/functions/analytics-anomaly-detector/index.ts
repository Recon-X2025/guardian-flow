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
      case 'detect_anomalies':
        result = await detectAnomalies(supabase, payload);
        break;
      case 'get_anomalies':
        result = await getAnomalies(supabase, payload.workspaceId);
        break;
      case 'acknowledge_anomaly':
        result = await acknowledgeAnomaly(supabase, user.id, payload.anomalyId, payload.notes);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-anomaly-detector:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function detectAnomalies(supabase: any, payload: any) {
  const { workspaceId, dataSourceId, metricName } = payload;

  // Simulate anomaly detection using statistical methods
  // In production, this would use ML models or statistical algorithms
  const anomalies = [];
  const shouldDetect = Math.random() > 0.7;

  if (shouldDetect) {
    const detectedValue = 1000 + Math.random() * 500;
    const expectedValue = 1000;
    const deviation = Math.abs(detectedValue - expectedValue) / expectedValue;

    const { data: anomaly, error } = await supabase
      .from('analytics_anomalies')
      .insert({
        workspace_id: workspaceId,
        anomaly_type: ['outlier', 'trend_break', 'data_drift'][Math.floor(Math.random() * 3)],
        data_source_id: dataSourceId,
        metric_name: metricName,
        detected_value: detectedValue,
        expected_value: expectedValue,
        deviation_score: deviation,
        confidence_score: 0.7 + Math.random() * 0.3,
        severity: deviation > 0.3 ? 'high' : deviation > 0.15 ? 'medium' : 'low',
        context: {
          detection_method: 'statistical_analysis',
          window_size: '24h',
          baseline_period: '30d'
        }
      })
      .select()
      .single();

    if (error) throw error;
    anomalies.push(anomaly);
  }

  return { 
    anomalies_detected: anomalies.length,
    anomalies 
  };
}

async function getAnomalies(supabase: any, workspaceId: string) {
  const { data: anomalies, error } = await supabase
    .from('analytics_anomalies')
    .select(`
      *,
      data_source:analytics_data_sources(name, source_type),
      acknowledged_by_user:profiles!analytics_anomalies_acknowledged_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('detected_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { anomalies };
}

async function acknowledgeAnomaly(supabase: any, userId: string, anomalyId: string, notes: string) {
  const { data: anomaly, error } = await supabase
    .from('analytics_anomalies')
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
      resolution_notes: notes
    })
    .eq('id', anomalyId)
    .select()
    .single();

  if (error) throw error;

  return { anomaly };
}
