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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    console.log('[Model Monitor] Action:', action);

    switch (action) {
      case 'record_metrics': {
        const { model_id, metrics, prediction_data } = params;

        const { data, error } = await supabase
          .from('model_performance_metrics')
          .insert({
            model_id,
            accuracy: metrics.accuracy,
            precision: metrics.precision,
            recall: metrics.recall,
            f1_score: metrics.f1_score,
            latency_ms: metrics.latency_ms,
            prediction_count: metrics.prediction_count,
            error_rate: metrics.error_rate,
            drift_score: metrics.drift_score,
            metadata: prediction_data
          })
          .select()
          .single();

        if (error) throw error;

        // Check for performance degradation
        const { data: recentMetrics } = await supabase
          .from('model_performance_metrics')
          .select('accuracy, drift_score')
          .eq('model_id', model_id)
          .order('recorded_at', { ascending: false })
          .limit(10);

        if (recentMetrics && recentMetrics.length > 1) {
          const avgAccuracy = recentMetrics.reduce((sum, m) => sum + (m.accuracy || 0), 0) / recentMetrics.length;
          const avgDrift = recentMetrics.reduce((sum, m) => sum + (m.drift_score || 0), 0) / recentMetrics.length;

          const needsRetraining = avgAccuracy < 0.7 || avgDrift > 0.3;

          if (needsRetraining) {
            console.log('[Model Monitor] Performance degradation detected for model:', model_id);
            
            // Trigger retraining
            await supabase.functions.invoke('agent-orchestrator', {
              body: {
                action: 'trigger_agent',
                agent_id: 'ml_ops_agent',
                parameters: {
                  task: 'retrain_model',
                  model_id,
                  reason: avgAccuracy < 0.7 ? 'accuracy_degradation' : 'data_drift',
                  metrics: { avgAccuracy, avgDrift }
                }
              }
            });
          }
        }

        console.log('[Model Monitor] Metrics recorded for model:', model_id);
        return new Response(JSON.stringify({ success: true, metric_id: data.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_performance': {
        const { model_id, time_range_days } = params;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (time_range_days || 7));

        const { data, error } = await supabase
          .from('model_performance_metrics')
          .select('*')
          .eq('model_id', model_id)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true });

        if (error) throw error;

        const summary = {
          total_predictions: data.reduce((sum, m) => sum + (m.prediction_count || 0), 0),
          avg_accuracy: data.reduce((sum, m) => sum + (m.accuracy || 0), 0) / data.length,
          avg_latency: data.reduce((sum, m) => sum + (m.latency_ms || 0), 0) / data.length,
          avg_drift: data.reduce((sum, m) => sum + (m.drift_score || 0), 0) / data.length,
          error_rate: data.reduce((sum, m) => sum + (m.error_rate || 0), 0) / data.length,
          metrics_over_time: data
        };

        return new Response(JSON.stringify({ success: true, summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'detect_anomalies': {
        const { model_id, threshold } = params;

        const { data: metrics } = await supabase
          .from('model_performance_metrics')
          .select('*')
          .eq('model_id', model_id)
          .order('recorded_at', { ascending: false })
          .limit(50);

        if (!metrics || metrics.length < 10) {
          return new Response(JSON.stringify({
            success: true,
            anomalies: [],
            message: 'Insufficient data for anomaly detection'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accuracies = metrics.map(m => m.accuracy || 0);
        const mean = accuracies.reduce((sum, v) => sum + v, 0) / accuracies.length;
        const stdDev = Math.sqrt(
          accuracies.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / accuracies.length
        );

        const anomalies = metrics.filter(m => {
          const zScore = Math.abs(((m.accuracy || 0) - mean) / stdDev);
          return zScore > (threshold || 2);
        });

        console.log('[Model Monitor] Anomalies detected:', anomalies.length);

        return new Response(JSON.stringify({
          success: true,
          anomalies,
          statistics: { mean, stdDev, threshold: threshold || 2 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'compare_models': {
        const { model_ids, metric_name } = params;

        const comparisons = await Promise.all(
          model_ids.map(async (id: string) => {
            const { data } = await supabase
              .from('model_performance_metrics')
              .select('*')
              .eq('model_id', id)
              .order('recorded_at', { ascending: false })
              .limit(10);

            const avgMetric = data?.reduce((sum, m) => sum + (m[metric_name] || 0), 0) / (data?.length || 1);

            return { model_id: id, avg_metric: avgMetric, latest_data: data };
          })
        );

        return new Response(JSON.stringify({ success: true, comparisons }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[Model Monitor] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
