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

  const traceId = crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const today = new Date(now.toISOString().split('T')[0]);

    // Ensure default active models exist (idempotent)
    const defaults = [
      { key: 'engineer_shrinkage_default', type: 'engineer_shrinkage', name: 'Engineer Shrinkage Default', freq: 'weekly' },
      { key: 'repair_volume_default', type: 'repair_volume', name: 'Repair Volume Default', freq: 'daily' },
      { key: 'spend_revenue_default', type: 'spend_revenue', name: 'Spend & Revenue Default', freq: 'daily' },
    ];

    let createdModels = 0;
    for (const d of defaults) {
      const { data: existing } = await supabase
        .from('forecast_models')
        .select('id')
        .eq('model_key', d.key)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from('forecast_models').insert({
          model_key: d.key,
          model_type: d.type,
          model_version: 1,
          artifact_uri: null,
          metrics: {},
          hyperparams: {},
          training_data_range: null,
          features: [],
          active: true,
          model_name: d.name,
          algorithm: 'naive',
          frequency: d.freq,
        });
        if (insertErr) throw insertErr;
        createdModels += 1;
      }
    }

    // Seed forecast outputs if empty for the next 30 days per type
    const daysAhead = 30;
    let createdOutputs = 0;

    for (const d of defaults) {
      const { data: anyFuture } = await supabase
        .from('forecast_outputs')
        .select('id')
        .eq('forecast_type', d.type)
        .gte('target_date', today.toISOString().split('T')[0])
        .limit(1)
        .maybeSingle();

      if (!anyFuture) {
        // find model id
        const { data: model } = await supabase
          .from('forecast_models')
          .select('id')
          .eq('model_key', d.key)
          .maybeSingle();

        const outputs: any[] = [];
        const base = d.type === 'spend_revenue' ? 10000 : d.type === 'repair_volume' ? 200 : 50;
        for (let i = 1; i <= daysAhead; i++) {
          const dt = new Date(today);
          dt.setDate(dt.getDate() + i);
          const value = Math.round(base * (1 + 0.01 * i));
          outputs.push({
            model_id: model?.id ?? null,
            forecast_type: d.type,
            target_date: dt.toISOString().split('T')[0],
            value,
            lower_bound: Math.round(value * 0.85),
            upper_bound: Math.round(value * 1.15),
            tenant_id: null,
            metadata: { bootstrap: true, traceId },
          });
        }
        const { error: outErr } = await supabase.from('forecast_outputs').insert(outputs);
        if (outErr) throw outErr;
        createdOutputs += outputs.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, createdModels, createdOutputs, traceId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ensure-forecast-models error:', error, 'traceId:', traceId);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
