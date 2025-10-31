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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      detection_id,
      correct_prediction,
      actual_forgery_type,
      feedback_type,
      feedback_notes,
      impact_rating
    } = await req.json();

    console.log(`[${correlationId}] Processing feedback for detection: ${detection_id}`);

    // Get the detection details
    const { data: detection, error: detectionError } = await supabase
      .from('forgery_detections')
      .select('*')
      .eq('id', detection_id)
      .single();

    if (detectionError || !detection) {
      return new Response(JSON.stringify({ error: 'Detection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('forgery_feedback')
      .insert({
        detection_id,
        correct_prediction,
        actual_forgery_type,
        feedback_type,
        user_id: user.id,
        feedback_notes,
        impact_rating
      })
      .select()
      .single();

    if (feedbackError) throw feedbackError;

    // Update detection review status
    const newReviewStatus = correct_prediction ? 'confirmed' : 'false_positive';
    await supabase
      .from('forgery_detections')
      .update({
        review_status: newReviewStatus,
        reviewer_id: user.id,
        review_notes: feedback_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', detection_id);

    // Analyze feedback patterns for retraining triggers
    const shouldTriggerRetraining = await analyzeFeedbackPatterns(supabase, feedback);

    if (shouldTriggerRetraining) {
      await supabase
        .from('forgery_feedback')
        .update({ retraining_triggered: true })
        .eq('id', feedback.id);

      console.log(`[${correlationId}] Retraining triggered based on feedback patterns`);
    }

    // Check if this is a high-impact false positive
    if (!correct_prediction && impact_rating >= 4) {
      await supabase
        .from('forgery_monitoring_alerts')
        .insert({
          alert_type: 'high_false_positive_rate',
          severity: 'warning',
          metric_name: 'user_reported_false_positive',
          threshold_value: 4,
          actual_value: impact_rating,
          model_version: detection.model_version,
          affected_images: 1,
          time_window_hours: 1,
          details: {
            detection_id,
            feedback_notes,
            user_id: user.id,
            correlation_id: correlationId
          }
        });
    }

    console.log(`[${correlationId}] Feedback processed successfully`);

    return new Response(JSON.stringify({
      success: true,
      feedback_id: feedback.id,
      retraining_triggered: shouldTriggerRetraining,
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

async function analyzeFeedbackPatterns(supabase: any, currentFeedback: any): Promise<boolean> {
  // Get recent feedback
  const { data: recentFeedback } = await supabase
    .from('forgery_feedback')
    .select('correct_prediction, impact_rating')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!recentFeedback || recentFeedback.length < 20) return false;

  // Calculate metrics
  const incorrectPredictions = recentFeedback.filter((f: any) => !f.correct_prediction).length;
  const incorrectRate = incorrectPredictions / recentFeedback.length;
  const highImpactCount = recentFeedback.filter((f: any) => f.impact_rating >= 4).length;

  // Trigger retraining if:
  // - More than 20% incorrect predictions
  // - More than 5 high-impact issues in recent feedback
  return incorrectRate > 0.2 || highImpactCount > 5;
}