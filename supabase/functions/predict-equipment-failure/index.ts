import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { equipment_id } = await req.json();

    // Get equipment history
    const { data: history } = await authResult.context.supabase
      .from('equipment_history')
      .select('*')
      .eq('equipment_id', equipment_id)
      .order('event_date', { ascending: false })
      .limit(50);

    // Get sensor data
    const { data: sensors } = await authResult.context.supabase
      .from('equipment_sensors')
      .select('*')
      .eq('equipment_id', equipment_id)
      .order('recorded_at', { ascending: false })
      .limit(100);

    // Simple ML logic for demonstration (in production, use actual ML models)
    let failureProbability = 0;
    const factors = [];

    // Check maintenance frequency
    const maintenanceEvents = history?.filter(h => h.event_type === 'maintenance') || [];
    if (maintenanceEvents.length === 0) {
      failureProbability += 0.3;
      factors.push('No maintenance history');
    }

    // Check sensor anomalies
    const abnormalSensors = sensors?.filter(s => s.status === 'abnormal') || [];
    if (abnormalSensors.length > 5) {
      failureProbability += 0.4;
      factors.push('Multiple sensor anomalies detected');
    }

    // Check downtime history
    const downtimeEvents = history?.filter(h => h.downtime_hours && h.downtime_hours > 24) || [];
    if (downtimeEvents.length > 2) {
      failureProbability += 0.2;
      factors.push('Multiple downtime incidents');
    }

    // Calculate predicted failure date
    const daysUntilFailure = Math.floor((1 - failureProbability) * 180);
    const predictedFailureDate = new Date();
    predictedFailureDate.setDate(predictedFailureDate.getDate() + daysUntilFailure);

    const riskLevel = failureProbability > 0.7 ? 'high' : failureProbability > 0.4 ? 'medium' : 'low';

    // Save prediction
    const { data: prediction, error } = await authResult.context.supabase
      .from('maintenance_predictions')
      .insert({
        equipment_id,
        prediction_type: 'failure',
        failure_probability: failureProbability,
        predicted_failure_date: predictedFailureDate.toISOString().split('T')[0],
        confidence_score: 0.75,
        risk_level: riskLevel,
        recommended_action: failureProbability > 0.5 ? 'Schedule preventive maintenance immediately' : 'Monitor equipment closely',
        contributing_factors: factors,
        model_version: 'v1.0'
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});