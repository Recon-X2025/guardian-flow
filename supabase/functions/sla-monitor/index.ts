import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { trackEvent } from '../_shared/analytics.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running SLA monitoring...');

    // Get all active work orders
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id, created_at, status, ticket_id')
      .in('status', ['draft', 'pending', 'assigned', 'in_progress']);

    if (woError) throw woError;

    if (!workOrders || workOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active work orders to monitor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const predictions: any[] = [];
    const alerts: any[] = [];

    for (const wo of workOrders) {
      const prediction = await predictSLABreach(wo);
      predictions.push(prediction);

      // Create alert if high risk
      if (prediction.breach_probability > 70) {
        const alert = {
          work_order_id: wo.id,
          alert_type: prediction.breach_probability > 90 ? 'critical' : 'warning',
          breach_probability: prediction.breach_probability,
        };
        alerts.push(alert);

        // Track analytics event
        const { data: ticket } = await supabase
          .from('tickets')
          .select('tenant_id')
          .eq('id', wo.ticket_id)
          .single();

        if (ticket) {
          await trackEvent({
            tenantId: ticket.tenant_id,
            eventType: 'sla.warning',
            eventCategory: 'operational',
            entityType: 'work_order',
            entityId: wo.id,
            metadata: { breach_probability: prediction.breach_probability },
          });
        }
      }
    }

    // Upsert predictions
    if (predictions.length > 0) {
      await supabase.from('sla_predictions').upsert(predictions);
    }

    // Insert alerts
    if (alerts.length > 0) {
      await supabase.from('sla_alerts').insert(alerts);
    }

    console.log(`Processed ${workOrders.length} work orders, created ${alerts.length} alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        work_orders_processed: workOrders.length,
        predictions_created: predictions.length,
        alerts_created: alerts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SLA monitoring error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function predictSLABreach(workOrder: any) {
  const now = new Date();
  const createdAt = new Date(workOrder.created_at);
  const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Simple ML model - calculate breach probability based on time elapsed
  const SLA_HOURS = 48;
  let breachProbability = 0;

  if (workOrder.status === 'draft') {
    breachProbability = Math.min((hoursElapsed / SLA_HOURS) * 100, 95);
  } else if (workOrder.status === 'pending') {
    breachProbability = Math.min((hoursElapsed / SLA_HOURS) * 80, 90);
  } else if (workOrder.status === 'assigned') {
    breachProbability = Math.min((hoursElapsed / SLA_HOURS) * 60, 80);
  } else if (workOrder.status === 'in_progress') {
    breachProbability = Math.min((hoursElapsed / SLA_HOURS) * 40, 70);
  }

  const predictedCompletion = new Date(createdAt.getTime() + SLA_HOURS * 60 * 60 * 1000);
  const slaDeadline = predictedCompletion;

  return {
    work_order_id: workOrder.id,
    predicted_completion: predictedCompletion.toISOString(),
    sla_deadline: slaDeadline.toISOString(),
    breach_probability: Math.round(breachProbability * 100) / 100,
    contributing_factors: {
      hours_elapsed: Math.round(hoursElapsed * 10) / 10,
      current_status: workOrder.status,
      time_remaining: Math.max(0, SLA_HOURS - hoursElapsed),
    },
    confidence_score: 75.0,
    model_version: 'v1.0-simple',
  };
}
