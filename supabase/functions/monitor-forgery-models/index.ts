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

  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[${correlationId}] Starting model monitoring check`);

    // Get active model
    const { data: activeModel } = await supabase
      .from('forgery_model_metrics')
      .select('*')
      .eq('is_active', true)
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single();

    if (!activeModel) {
      console.log('No active model found');
      return new Response(JSON.stringify({ success: true, message: 'No active model' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recent detections (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDetections } = await supabase
      .from('forgery_detections')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .eq('model_version', activeModel.model_version);

    if (!recentDetections || recentDetections.length === 0) {
      console.log('No recent detections to analyze');
      return new Response(JSON.stringify({ success: true, message: 'No recent detections' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alerts = [];

    // 1. Check processing time
    const avgProcessingTime = recentDetections.reduce((sum, d) => sum + (d.processing_time_ms || 0), 0) / recentDetections.length;
    if (avgProcessingTime > activeModel.avg_processing_time_ms * 1.5) {
      alerts.push(await createAlert(supabase, {
        alert_type: 'processing_delay',
        severity: avgProcessingTime > activeModel.avg_processing_time_ms * 2 ? 'critical' : 'warning',
        metric_name: 'avg_processing_time_ms',
        threshold_value: activeModel.avg_processing_time_ms * 1.5,
        actual_value: avgProcessingTime,
        model_version: activeModel.model_version,
        affected_images: recentDetections.length,
        time_window_hours: 24,
        details: {
          expected_time: activeModel.avg_processing_time_ms,
          actual_time: avgProcessingTime,
          increase_percentage: ((avgProcessingTime / activeModel.avg_processing_time_ms - 1) * 100).toFixed(2)
        }
      }));
    }

    // 2. Check accuracy (based on reviewed detections)
    const reviewedDetections = recentDetections.filter(d => 
      d.review_status === 'confirmed' || d.review_status === 'false_positive'
    );

    if (reviewedDetections.length >= 20) {
      const correctDetections = reviewedDetections.filter(d => d.review_status === 'confirmed').length;
      const accuracy = correctDetections / reviewedDetections.length;

      if (accuracy < activeModel.accuracy * 0.9) {
        alerts.push(await createAlert(supabase, {
          alert_type: 'low_accuracy',
          severity: accuracy < activeModel.accuracy * 0.8 ? 'critical' : 'warning',
          metric_name: 'model_accuracy',
          threshold_value: activeModel.accuracy * 0.9,
          actual_value: accuracy,
          model_version: activeModel.model_version,
          affected_images: reviewedDetections.length,
          time_window_hours: 24,
          details: {
            expected_accuracy: activeModel.accuracy,
            actual_accuracy: accuracy,
            reviewed_samples: reviewedDetections.length,
            recommendation: 'Review recent false positives and consider model retraining'
          }
        }));
      }
    }

    // 3. Check for model drift
    const driftScore = await calculateDriftScore(supabase, activeModel, recentDetections);
    if (driftScore > 0.2) {
      alerts.push(await createAlert(supabase, {
        alert_type: 'model_drift',
        severity: driftScore > 0.3 ? 'critical' : 'warning',
        metric_name: 'drift_score',
        threshold_value: 0.2,
        actual_value: driftScore,
        model_version: activeModel.model_version,
        affected_images: recentDetections.length,
        time_window_hours: 24,
        details: {
          drift_score: driftScore,
          distribution_changes: 'Detected significant changes in feature distributions',
          recommendation: 'Model may need retraining on recent data'
        }
      }));

      // Update model metrics with drift information
      await supabase
        .from('forgery_model_metrics')
        .update({
          drift_score: driftScore,
          drift_detected: true
        })
        .eq('id', activeModel.id);
    }

    // 4. Check false positive rate
    if (reviewedDetections.length >= 20) {
      const falsePositives = reviewedDetections.filter(d => d.review_status === 'false_positive').length;
      const fpRate = falsePositives / reviewedDetections.length;

      if (fpRate > 0.15) {
        alerts.push(await createAlert(supabase, {
          alert_type: 'high_false_positive_rate',
          severity: fpRate > 0.25 ? 'critical' : 'warning',
          metric_name: 'false_positive_rate',
          threshold_value: 0.15,
          actual_value: fpRate,
          model_version: activeModel.model_version,
          affected_images: reviewedDetections.length,
          time_window_hours: 24,
          details: {
            false_positives: falsePositives,
            total_reviewed: reviewedDetections.length,
            rate: fpRate,
            recommendation: 'Review false positive patterns and adjust detection threshold'
          }
        }));
      }
    }

    console.log(`[${correlationId}] Monitoring complete. Created ${alerts.length} alerts`);

    return new Response(JSON.stringify({
      success: true,
      model_version: activeModel.model_version,
      detections_analyzed: recentDetections.length,
      alerts_created: alerts.length,
      alerts,
      correlation_id: correlationId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      correlation_id: correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createAlert(supabase: any, alertData: any) {
  const { data, error } = await supabase
    .from('forgery_monitoring_alerts')
    .insert(alertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create alert:', error);
    return null;
  }

  return data;
}

async function calculateDriftScore(supabase: any, model: any, recentDetections: any[]): Promise<number> {
  // Get historical baseline detections
  const baselineDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: baselineDetections } = await supabase
    .from('forgery_detections')
    .select('confidence_score, forgery_type, feature_analysis')
    .lt('created_at', baselineDate)
    .eq('model_version', model.model_version)
    .limit(200);

  if (!baselineDetections || baselineDetections.length < 50) return 0;

  // Calculate distribution differences
  const recentAvgConfidence = recentDetections.reduce((sum: number, d: any) => sum + d.confidence_score, 0) / recentDetections.length;
  const baselineAvgConfidence = baselineDetections.reduce((sum: number, d: any) => sum + d.confidence_score, 0) / baselineDetections.length;

  const confidenceDrift = Math.abs(recentAvgConfidence - baselineAvgConfidence);

  // Check forgery type distribution
  const recentTypes = recentDetections.map((d: any) => d.forgery_type);
  const baselineTypes = baselineDetections.map((d: any) => d.forgery_type);
  
  const recentTypeDistribution = getTypeDistribution(recentTypes);
  const baselineTypeDistribution = getTypeDistribution(baselineTypes);
  
  const typeDrift = calculateDistributionDifference(recentTypeDistribution, baselineTypeDistribution);

  // Combined drift score
  return Math.min((confidenceDrift * 0.4 + typeDrift * 0.6), 1);
}

function getTypeDistribution(types: string[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  types.forEach(type => {
    distribution[type] = (distribution[type] || 0) + 1;
  });
  const total = types.length;
  Object.keys(distribution).forEach(key => {
    distribution[key] = distribution[key] / total;
  });
  return distribution;
}

function calculateDistributionDifference(dist1: Record<string, number>, dist2: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
  let totalDiff = 0;
  allKeys.forEach(key => {
    const val1 = dist1[key] || 0;
    const val2 = dist2[key] || 0;
    totalDiff += Math.abs(val1 - val2);
  });
  return totalDiff / 2; // Normalize
}