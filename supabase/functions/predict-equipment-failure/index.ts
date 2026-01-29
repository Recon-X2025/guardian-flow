import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { equipmentId } = await req.json();

    const { data: events } = await supabase
      .from('asset_lifecycle_events')
      .select('*')
      .eq('asset_id', equipmentId)
      .eq('tenant_id', profile.tenant_id)
      .order('event_timestamp', { ascending: false })
      .limit(100);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          prediction: 'low_risk',
          confidence: 0,
          message: 'Insufficient data for prediction'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maintenanceEvents = events.filter((e: any) => e.event_type === 'maintenance');
    const failureEvents = events.filter((e: any) => e.event_type === 'failure');
    const now = Date.now();

    const daysSinceLastMaintenance = maintenanceEvents.length > 0
      ? (now - new Date(maintenanceEvents[0].event_timestamp).getTime()) / (86400000)
      : 365;
    const failureRate = failureEvents.length / events.length;
    const maintenanceCount = maintenanceEvents.length;
    const equipmentAge = (now - new Date(events[events.length - 1].event_timestamp).getTime()) / 86400000;
    const monthsActive = Math.max(equipmentAge / 30, 1);
    const eventsPerMonth = events.length / monthsActive;
    const daysSinceLastFailure = failureEvents.length > 0
      ? (now - new Date(failureEvents[0].event_timestamp).getTime()) / 86400000
      : 999;

    // Try to load trained logistic regression model
    const { data: model } = await supabase
      .from('ml_models')
      .select('hyperparameters')
      .eq('model_type', 'equipment_failure')
      .eq('status', 'deployed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    let prediction: string;
    let confidence: number;
    let method: string;

    if (model?.hyperparameters?.weights) {
      // --- Real ML: Logistic regression inference ---
      const w = model.hyperparameters;
      const features = [daysSinceLastMaintenance, failureRate, maintenanceCount, equipmentAge, eventsPerMonth, daysSinceLastFailure];
      const normalized = features.map((v: number, i: number) =>
        (v - (w.featureMeans?.[i] || 0)) / (w.featureStds?.[i] || 1)
      );
      const z = w.weights.reduce((s: number, wt: number, i: number) => s + wt * normalized[i], 0) + w.bias;
      const probability = 1 / (1 + Math.exp(-z));

      prediction = probability > 0.7 ? 'high_risk' : probability > 0.4 ? 'medium_risk' : 'low_risk';
      confidence = Math.round(Math.abs(probability - 0.5) * 200); // 0-100 scale
      method = 'logistic_regression';
    } else {
      // --- Fallback: heuristic thresholds ---
      if (daysSinceLastMaintenance > 180 || failureRate > 0.1) {
        prediction = 'high_risk'; confidence = 85;
      } else if (daysSinceLastMaintenance > 90 || failureRate > 0.05) {
        prediction = 'medium_risk'; confidence = 70;
      } else {
        prediction = 'low_risk'; confidence = 60;
      }
      method = 'heuristic_fallback';
    }

    const nextMaintenanceDate = new Date();
    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + Math.max(0, 90 - daysSinceLastMaintenance));

    return new Response(
      JSON.stringify({
        prediction,
        confidence,
        method,
        daysSinceLastMaintenance: Math.round(daysSinceLastMaintenance),
        failureRate: (failureRate * 100).toFixed(2),
        recommendedMaintenanceDate: nextMaintenanceDate.toISOString(),
        factors: {
          maintenanceHistory: maintenanceEvents.length,
          failureHistory: failureEvents.length,
          totalEvents: events.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error predicting equipment failure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});