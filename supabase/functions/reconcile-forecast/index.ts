import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { target_date, forecast_type, tenant_id } = await req.json();

    // Fetch all forecasts for the target date
    const { data: forecasts, error } = await supabase
      .from('forecast_outputs')
      .select('*')
      .eq('forecast_type', forecast_type)
      .eq('target_date', target_date)
      .eq('tenant_id', tenant_id);

    if (error) throw error;

    if (!forecasts || forecasts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No forecasts to reconcile', reconciled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hierarchical reconciliation using MinT approach
    const levels = ['country', 'region', 'state', 'district', 'city', 'partner_hub', 'pin_code'];
    const forecastsByLevel: Record<string, any[]> = {};

    // Group by level
    for (const level of levels) {
      forecastsByLevel[level] = forecasts.filter(f => f.geography_level === level);
    }

    // Bottom-up aggregation
    const adjustments = [];
    
    for (let i = levels.length - 1; i > 0; i--) {
      const childLevel = levels[i];
      const parentLevel = levels[i - 1];
      
      const childForecasts = forecastsByLevel[childLevel] || [];
      const parentForecasts = forecastsByLevel[parentLevel] || [];

      // For each parent, sum children and adjust
      for (const parent of parentForecasts) {
        const children = childForecasts.filter(c => 
          c[parentLevel] === parent[parentLevel]
        );

        if (children.length === 0) continue;

        const childSum = children.reduce((sum, c) => sum + Number(c.value), 0);
        const parentValue = Number(parent.value);
        const variance = childSum - parentValue;

        // If variance > 3%, adjust parent upward
        if (Math.abs(variance / parentValue) > 0.03) {
          adjustments.push({
            id: parent.id,
            old_value: parentValue,
            new_value: childSum,
            variance_pct: (variance / parentValue * 100).toFixed(2)
          });

          await supabase
            .from('forecast_outputs')
            .update({ 
              value: childSum,
              metadata: {
                ...parent.metadata,
                reconciled: true,
                original_value: parentValue,
                reconciliation_date: new Date().toISOString()
              }
            })
            .eq('id', parent.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reconciliation complete',
        forecasts_processed: forecasts.length,
        adjustments_made: adjustments.length,
        adjustments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('reconcile-forecast error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});