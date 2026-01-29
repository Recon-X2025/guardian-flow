import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { timeframe = '7d' } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', authResult.context.user.id)
      .single();
    
    const tenantId = profile?.tenant_id;

    // Fetch open work orders
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (!workOrders || workOrders.length === 0) {
      return new Response(JSON.stringify({
        atRiskOrders: 0,
        confidence: 100,
        recommendedActions: 0,
        predictions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Load trained logistic regression model weights
    const { data: model } = await supabase
      .from('ml_models')
      .select('hyperparameters')
      .eq('model_type', 'sla_breach')
      .eq('status', 'deployed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const mlWeights = model?.hyperparameters;
    const priorityMap: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

    const now = Date.now();
    const predictions = workOrders.map((wo: any) => {
      const createdAt = new Date(wo.created_at);
      const ageHours = (now - createdAt.getTime()) / 3600000;
      const ageInDays = ageHours / 24;
      const priority = wo.priority || wo.repair_type || 'medium';

      let breachProbability: number;
      let method: string;

      if (mlWeights?.weights) {
        // --- Real ML: Logistic regression inference ---
        const features = [
          ageHours,
          priorityMap[priority] || 2,
          wo.technician_id ? 1 : 0,
          createdAt.getDay(),
          createdAt.getHours(),
        ];
        const normalized = features.map((v: number, i: number) =>
          (v - (mlWeights.featureMeans?.[i] || 0)) / (mlWeights.featureStds?.[i] || 1)
        );
        const z = mlWeights.weights.reduce((s: number, wt: number, i: number) => s + wt * normalized[i], 0) + mlWeights.bias;
        breachProbability = Math.round((1 / (1 + Math.exp(-z))) * 100);
        method = 'logistic_regression';
      } else {
        // --- Fallback: heuristic point scoring ---
        let riskScore = 0;
        if (ageInDays > 5) riskScore += 30;
        if (ageInDays > 6) riskScore += 30;
        if (priority === 'urgent') riskScore += 20;
        if (priority === 'high') riskScore += 10;
        if (!wo.technician_id) riskScore += 20;
        breachProbability = Math.min(riskScore, 95);
        method = 'heuristic_fallback';
      }

      return {
        workOrderId: wo.id,
        workOrderNumber: wo.wo_number,
        age: ageInDays.toFixed(1),
        priority,
        breachProbability,
        atRisk: breachProbability > 50,
        timeToBreachDays: Math.max(0, 7 - ageInDays).toFixed(1),
        method,
        recommendedAction: breachProbability > 70
          ? 'Urgent: Assign technician immediately'
          : breachProbability > 50
          ? 'Prioritize assignment'
          : 'Monitor'
      };
    });

    const atRiskOrders = predictions.filter(p => p.atRisk).length;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.breachProbability, 0) / predictions.length;

    // Log prediction to ml_predictions table
    await supabase.from('ml_predictions').insert({
      tenant_id: tenantId,
      prediction_type: 'sla_breach',
      input_data: { timeframe, orderCount: workOrders.length },
      prediction_output: { atRiskOrders, predictions: predictions.slice(0, 10) },
      confidence_score: avgConfidence
    });

    return new Response(JSON.stringify({
      atRiskOrders,
      confidence: avgConfidence.toFixed(0),
      recommendedActions: atRiskOrders,
      predictions: predictions.filter(p => p.atRisk).slice(0, 20)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('SLA prediction error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});