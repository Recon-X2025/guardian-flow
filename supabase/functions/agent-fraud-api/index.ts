import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-correlation-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenantId = req.headers.get('x-tenant-id');
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    const { action, resource_type, resource_id, data } = await req.json();

    console.log(`[Fraud API] Action: ${action}, Tenant: ${tenantId}, Correlation: ${correlationId}`);

    let result;

    switch (action) {
      case 'validate_photos':
        result = await validatePhotos(supabase, resource_id, data);
        break;
      
      case 'detect_anomaly':
        result = await detectAnomaly(supabase, resource_type, resource_id, data);
        break;
      
      case 'get_fraud_alerts':
        result = await getFraudAlerts(supabase, tenantId!, data);
        break;
      
      case 'update_investigation':
        result = await updateInvestigation(supabase, resource_id, data);
        break;
      
      case 'get_fraud_score':
        result = await getFraudScore(supabase, resource_type, resource_id);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        correlation_id: correlationId,
        response_time_ms: responseTime,
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );

  } catch (error: any) {
    console.error('[Fraud API] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function validatePhotos(supabase: any, workOrderId: string, data: any) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workOrderId, ...data }),
  });

  return await response.json();
}

async function detectAnomaly(supabase: any, resourceType: string, resourceId: string, data: any) {
  // Calculate fraud score based on multiple factors
  const score = await calculateFraudScore(supabase, resourceType, resourceId, data);

  // If score is high, create fraud alert
  if (score.confidence_score > 0.7) {
    const { data: alert, error } = await supabase
      .from('fraud_alerts')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        anomaly_type: data.anomaly_type || 'suspicious_pattern',
        severity: score.confidence_score > 0.9 ? 'critical' : 'high',
        confidence_score: score.confidence_score,
        description: data.description || 'Anomaly detected by fraud detection system',
        detection_model: 'fraud-api-v1',
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return { alert, score };
  }

  return { alert: null, score };
}

async function getFraudAlerts(supabase: any, tenantId: string, filters: any = {}) {
  let query = supabase
    .from('fraud_alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('investigation_status', filters.status);
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters.anomaly_type) {
    query = query.eq('anomaly_type', filters.anomaly_type);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { alerts: data, total: count };
}

async function updateInvestigation(supabase: any, alertId: string, data: any) {
  const { data: updated, error } = await supabase
    .from('fraud_alerts')
    .update({
      investigation_status: data.status,
      resolution_notes: data.notes,
      investigator_id: data.investigator_id,
      resolved_at: data.status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

async function getFraudScore(supabase: any, resourceType: string, resourceId: string) {
  // Fetch resource data
  const { data: resource, error } = await supabase
    .from(resourceType === 'work_order' ? 'work_orders' : 'tickets')
    .select('*')
    .eq('id', resourceId)
    .single();

  if (error) throw error;

  // Calculate score
  const score = await calculateFraudScore(supabase, resourceType, resourceId, resource);
  
  return score;
}

async function calculateFraudScore(
  supabase: any, 
  resourceType: string, 
  resourceId: string, 
  data: any
): Promise<{ confidence_score: number; risk_factors: string[] }> {
  const riskFactors: string[] = [];
  let score = 0;

  // Check for photo anomalies
  if (resourceType === 'work_order') {
    const { data: validations } = await supabase
      .from('photo_validations')
      .select('*')
      .eq('work_order_id', resourceId)
      .eq('anomaly_detected', true);

    if (validations && validations.length > 0) {
      score += 0.3;
      riskFactors.push('Photo anomalies detected');
    }
  }

  // Check for suspicious timing patterns
  if (data.completed_at && data.released_at) {
    const completionTime = new Date(data.completed_at).getTime() - new Date(data.released_at).getTime();
    const hours = completionTime / (1000 * 60 * 60);
    
    if (hours < 1) {
      score += 0.2;
      riskFactors.push('Unusually fast completion');
    }
  }

  // Check for duplicate patterns
  const { data: similar } = await supabase
    .from(resourceType === 'work_order' ? 'work_orders' : 'tickets')
    .select('id')
    .eq('issue_description', data.issue_description)
    .neq('id', resourceId)
    .limit(5);

  if (similar && similar.length >= 3) {
    score += 0.25;
    riskFactors.push('Similar duplicate cases detected');
  }

  // Check for high-value anomalies
  if (data.total_cost && data.total_cost > 10000) {
    score += 0.15;
    riskFactors.push('High value transaction');
  }

  return {
    confidence_score: Math.min(score, 1),
    risk_factors: riskFactors,
  };
}
