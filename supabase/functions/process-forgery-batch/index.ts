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

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { job_name, image_ids, work_order_ids, job_type = 'detection' } = await req.json();

    console.log(`[${correlationId}] Starting batch job: ${job_name}`);

    // Create batch job record
    const batchId = crypto.randomUUID();
    const { data: job, error: jobError } = await supabase
      .from('forgery_batch_jobs')
      .insert({
        id: batchId,
        job_name,
        job_type,
        status: 'queued',
        image_ids: image_ids || [],
        work_order_ids: work_order_ids || [],
        total_images: image_ids?.length || 0,
        triggered_by: user.id
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Update status to processing
    await supabase
      .from('forgery_batch_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', batchId);

    // Get images to process
    let imagesToProcess: Array<{ id: string; work_order_id: string; filename: string }> = [];
    
    if (image_ids && image_ids.length > 0) {
      const { data: images } = await supabase
        .from('attachments')
        .select('id, work_order_id, filename')
        .in('id', image_ids);
      imagesToProcess = images || [];
    } else if (work_order_ids && work_order_ids.length > 0) {
      const { data: images } = await supabase
        .from('attachments')
        .select('id, work_order_id, filename')
        .in('work_order_id', work_order_ids);
      imagesToProcess = images || [];
    }

    console.log(`[${correlationId}] Processing ${imagesToProcess.length} images`);

    let processedCount = 0;
    let detectionsFound = 0;
    let errorsCount = 0;
    let totalConfidence = 0;

    // Process each image
    for (const image of imagesToProcess) {
      try {
        // Call forgery detection for each image
        const response = await fetch(`${supabaseUrl}/functions/v1/detect-image-forgery`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_id: image.id,
            work_order_id: image.work_order_id,
            image_data: {}, // In production, fetch actual image data
            batch_id: batchId
          })
        });

        if (response.ok) {
          const result = await response.json();
          processedCount++;
          
          if (result.result?.forgery_detected) {
            detectionsFound++;
            totalConfidence += result.result.confidence_score;
          }
        } else {
          errorsCount++;
        }

        // Update progress
        await supabase
          .from('forgery_batch_jobs')
          .update({
            processed_images: processedCount,
            detections_found: detectionsFound,
            errors_count: errorsCount
          })
          .eq('id', batchId);

      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        errorsCount++;
      }
    }

    const avgConfidence = detectionsFound > 0 ? totalConfidence / detectionsFound : 0;

    // Mark job as completed
    const completedAt = new Date().toISOString();
    const startedAt = new Date(job.created_at);
    const processingSeconds = Math.floor((new Date(completedAt).getTime() - startedAt.getTime()) / 1000);

    await supabase
      .from('forgery_batch_jobs')
      .update({
        status: 'completed',
        completed_at: completedAt,
        processing_time_seconds: processingSeconds,
        processed_images: processedCount,
        detections_found: detectionsFound,
        avg_confidence: avgConfidence,
        errors_count: errorsCount
      })
      .eq('id', batchId);

    console.log(`[${correlationId}] Batch job completed. Processed: ${processedCount}, Detections: ${detectionsFound}`);

    return new Response(JSON.stringify({
      success: true,
      batch_id: batchId,
      processed: processedCount,
      detections_found: detectionsFound,
      avg_confidence: avgConfidence,
      errors: errorsCount,
      processing_time_seconds: processingSeconds,
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