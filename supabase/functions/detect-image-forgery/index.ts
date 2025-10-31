import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// Simulate SURF/SIFT feature extraction and ML classification
// In production, this would call actual CV/ML models
interface FeatureAnalysis {
  keypoints_count: number;
  descriptor_length: number;
  matched_regions: number;
  anomaly_score: number;
  features: string[];
}

interface ForgeryResult {
  forgery_detected: boolean;
  forgery_type: string;
  confidence_score: number;
  tampered_regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  feature_analysis: FeatureAnalysis;
  processing_time_ms: number;
  model_type: string;
  model_version: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { image_id, work_order_id, image_data, batch_id } = await req.json();

    console.log(`[${correlationId}] Processing forgery detection for image: ${image_id}`);

    // Simulate feature extraction (SURF/SIFT)
    const featureAnalysis = await extractFeatures(image_data);
    
    // Simulate ML classification
    const detectionResult = await classifyForgery(featureAnalysis);
    
    const processingTime = Date.now() - startTime;

    // Store detection result
    const { data: detection, error: detectionError } = await supabase
      .from('forgery_detections')
      .insert({
        image_id,
        work_order_id,
        forgery_detected: detectionResult.forgery_detected,
        forgery_type: detectionResult.forgery_type,
        confidence_score: detectionResult.confidence_score,
        tampered_regions: detectionResult.tampered_regions,
        feature_analysis: detectionResult.feature_analysis,
        model_type: detectionResult.model_type,
        model_version: detectionResult.model_version,
        processing_time_ms: processingTime,
        batch_id,
        review_status: detectionResult.confidence_score > 0.9 ? 'pending' : 'needs_review'
      })
      .select()
      .single();

    if (detectionError) throw detectionError;

    // If high confidence forgery detected, create fraud alert
    if (detectionResult.forgery_detected && detectionResult.confidence_score > 0.75) {
      const { error: alertError } = await supabase
        .from('fraud_alerts')
        .insert({
          resource_type: 'work_order',
          resource_id: work_order_id,
          anomaly_type: 'photo_forgery',
          severity: detectionResult.confidence_score > 0.9 ? 'critical' : 'high',
          confidence_score: detectionResult.confidence_score,
          description: `Image forgery detected: ${detectionResult.forgery_type}. ${detectionResult.tampered_regions.length} tampered regions identified.`,
          detection_model: `${detectionResult.model_type}_${detectionResult.model_version}`,
          metadata: {
            detection_id: detection.id,
            forgery_type: detectionResult.forgery_type,
            tampered_regions: detectionResult.tampered_regions,
            feature_analysis: detectionResult.feature_analysis,
            correlation_id: correlationId
          }
        });

      if (alertError) console.error('Failed to create fraud alert:', alertError);
    }

    // Check for model performance issues
    await checkModelPerformance(supabase, detection);

    console.log(`[${correlationId}] Detection completed in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      detection_id: detection.id,
      result: detectionResult,
      processing_time_ms: processingTime,
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

// Simulate SURF/SIFT feature extraction
async function extractFeatures(imageData: any): Promise<FeatureAnalysis> {
  // In production: actual SURF/SIFT implementation
  // For now, simulate realistic output
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing

  const keypointsCount = Math.floor(Math.random() * 500) + 200;
  const matchedRegions = Math.floor(Math.random() * 10);
  const anomalyScore = Math.random();

  return {
    keypoints_count: keypointsCount,
    descriptor_length: 64,
    matched_regions: matchedRegions,
    anomaly_score: anomalyScore,
    features: [
      'edge_detection',
      'texture_analysis',
      'noise_pattern',
      'compression_artifacts',
      'color_distribution'
    ]
  };
}

// Simulate ML classification (SVM/Random Forest)
async function classifyForgery(features: FeatureAnalysis): Promise<ForgeryResult> {
  // In production: actual ML model inference
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing

  const isForgery = features.anomaly_score > 0.6 || features.matched_regions > 5;
  const confidence = isForgery 
    ? 0.7 + (features.anomaly_score * 0.3)
    : 0.1 + (Math.random() * 0.3);

  const forgeryTypes = ['copy_move', 'splicing', 'retouching', 'noise_inconsistency', 'compression_artifacts'];
  const forgeryType = isForgery 
    ? forgeryTypes[Math.floor(Math.random() * forgeryTypes.length)]
    : 'unknown';

  const tamperedRegions = isForgery ? Array.from(
    { length: Math.floor(Math.random() * 3) + 1 },
    (_, i) => ({
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      width: Math.floor(Math.random() * 200) + 50,
      height: Math.floor(Math.random() * 200) + 50,
      confidence: 0.7 + (Math.random() * 0.3)
    })
  ) : [];

  return {
    forgery_detected: isForgery,
    forgery_type: forgeryType,
    confidence_score: confidence,
    tampered_regions: tamperedRegions,
    feature_analysis: features,
    processing_time_ms: 150,
    model_type: 'surf_svm',
    model_version: 'v1.2.0'
  };
}

// Check model performance and create alerts if needed
async function checkModelPerformance(supabase: any, detection: any) {
  // Get recent detections for drift analysis
  const { data: recentDetections } = await supabase
    .from('forgery_detections')
    .select('confidence_score, review_status')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!recentDetections || recentDetections.length < 50) return;

  // Calculate false positive rate
  const reviewed = recentDetections.filter((d: any) => d.review_status === 'confirmed' || d.review_status === 'false_positive');
  if (reviewed.length < 20) return;

  const falsePositives = reviewed.filter((d: any) => d.review_status === 'false_positive').length;
  const falsePositiveRate = falsePositives / reviewed.length;

  // Create alert if false positive rate is too high
  if (falsePositiveRate > 0.15) {
    await supabase.from('forgery_monitoring_alerts').insert({
      alert_type: 'high_false_positive_rate',
      severity: falsePositiveRate > 0.25 ? 'critical' : 'warning',
      metric_name: 'false_positive_rate',
      threshold_value: 0.15,
      actual_value: falsePositiveRate,
      model_version: detection.model_version,
      affected_images: reviewed.length,
      time_window_hours: 24,
      details: {
        false_positives: falsePositives,
        total_reviewed: reviewed.length,
        recommendation: 'Consider model retraining with recent feedback data'
      }
    });
  }
}