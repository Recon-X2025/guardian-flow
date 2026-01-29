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
  const { workspaceId, dataSourceId, metricName, values } = payload;

  // If raw values provided, run inline statistical detection
  // Otherwise query recent metric values from the database
  let metricValues: number[] = values || [];

  if (metricValues.length === 0) {
    // Query recent anomaly-related metrics from pipeline runs
    const { data: runs } = await supabase
      .from('analytics_pipeline_runs')
      .select('records_processed')
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false })
      .limit(100);

    if (runs && runs.length > 0) {
      metricValues = runs.map((r: any) => r.records_processed || 0).filter((v: number) => v > 0);
    }
  }

  if (metricValues.length < 5) {
    return { anomalies_detected: 0, anomalies: [], message: 'Insufficient data for anomaly detection (need >= 5 values)' };
  }

  // --- Z-Score detection ---
  const mean = metricValues.reduce((a: number, b: number) => a + b, 0) / metricValues.length;
  const stdDev = Math.sqrt(metricValues.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / metricValues.length);

  // --- Modified Z-Score (MAD-based) ---
  const sorted = [...metricValues].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const deviations = metricValues.map((v: number) => Math.abs(v - median));
  const deviationsSorted = [...deviations].sort((a, b) => a - b);
  const mad = deviationsSorted.length % 2 === 0
    ? (deviationsSorted[deviationsSorted.length / 2 - 1] + deviationsSorted[deviationsSorted.length / 2]) / 2
    : deviationsSorted[Math.floor(deviationsSorted.length / 2)];

  // --- IQR detection ---
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const iqrLower = q1 - 1.5 * iqr;
  const iqrUpper = q3 + 1.5 * iqr;

  const detectedAnomalies: any[] = [];

  for (let i = 0; i < metricValues.length; i++) {
    const v = metricValues[i];
    const zScore = stdDev > 0 ? Math.abs((v - mean) / stdDev) : 0;
    const modZScore = mad > 0 ? Math.abs(0.6745 * (v - median) / mad) : 0;
    const iqrAnomaly = v < iqrLower || v > iqrUpper;

    let methodsAgreed = 0;
    if (zScore > 3) methodsAgreed++;
    if (modZScore > 3.5) methodsAgreed++;
    if (iqrAnomaly) methodsAgreed++;

    // Consensus: anomaly if >= 2 methods agree
    if (methodsAgreed >= 2) {
      const deviationScore = Math.max(zScore, modZScore);
      const confidence = methodsAgreed / 3;
      const severity = deviationScore > 5 ? 'high' : deviationScore > 3 ? 'medium' : 'low';
      const anomalyType = (i > 0 && detectedAnomalies.length > 0 &&
        detectedAnomalies[detectedAnomalies.length - 1]?.index === i - 1) ? 'trend_break' : 'outlier';

      const { data: anomaly, error } = await supabase
        .from('analytics_anomalies')
        .insert({
          workspace_id: workspaceId,
          anomaly_type: anomalyType,
          data_source_id: dataSourceId || null,
          metric_name: metricName || 'unknown',
          detected_value: v,
          expected_value: mean,
          deviation_score: deviationScore,
          confidence_score: confidence,
          severity,
          context: {
            detection_method: 'statistical_consensus',
            methods: { z_score: zScore, modified_z_score: modZScore, iqr_anomaly: iqrAnomaly },
            stats: { mean, median, std: stdDev, q1, q3, iqr },
          }
        })
        .select()
        .single();

      if (!error && anomaly) {
        detectedAnomalies.push({ ...anomaly, index: i });
      }
    }
  }

  return {
    anomalies_detected: detectedAnomalies.length,
    anomalies: detectedAnomalies,
    stats: { mean, median, std: stdDev, q1, q3, iqr, total_points: metricValues.length },
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
