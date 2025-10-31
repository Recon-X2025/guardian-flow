import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, experiment_id, user_id } = await req.json();

    if (action === 'assign_variant') {
      // Check if user already assigned
      const { data: existing } = await supabase
        .from('ab_test_results')
        .select('variant')
        .eq('experiment_id', experiment_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          variant: existing.variant,
          is_new: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get experiment config
      const { data: experiment } = await supabase
        .from('ab_test_experiments')
        .select('variants')
        .eq('id', experiment_id)
        .eq('status', 'running')
        .single();

      if (!experiment) {
        throw new Error('Experiment not found or not running');
      }

      // Assign variant based on weights
      const variant = selectVariant(experiment.variants);

      // Record assignment
      await supabase
        .from('ab_test_results')
        .insert({
          experiment_id,
          user_id,
          variant,
          converted: false
        });

      return new Response(JSON.stringify({
        success: true,
        variant,
        is_new: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'record_conversion') {
      const { conversion_value } = await req.json();

      await supabase
        .from('ab_test_results')
        .update({
          converted: true,
          conversion_value,
          converted_at: new Date().toISOString()
        })
        .eq('experiment_id', experiment_id)
        .eq('user_id', user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'get_results') {
      const { data: results } = await supabase
        .from('ab_test_results')
        .select('variant, converted, conversion_value')
        .eq('experiment_id', experiment_id);

      const stats = calculateStatistics(results || []);

      return new Response(JSON.stringify({ success: true, stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('A/B test error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function selectVariant(variants: any[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) return variant.name;
  }

  return variants[0].name; // Fallback
}

function calculateStatistics(results: any[]) {
  const byVariant: Record<string, any> = {};

  results.forEach(r => {
    if (!byVariant[r.variant]) {
      byVariant[r.variant] = {
        total: 0,
        conversions: 0,
        total_value: 0
      };
    }

    byVariant[r.variant].total++;
    if (r.converted) {
      byVariant[r.variant].conversions++;
      byVariant[r.variant].total_value += Number(r.conversion_value || 0);
    }
  });

  // Calculate conversion rates
  Object.keys(byVariant).forEach(variant => {
    const stats = byVariant[variant];
    stats.conversion_rate = stats.total > 0 ? (stats.conversions / stats.total) * 100 : 0;
    stats.avg_value = stats.conversions > 0 ? stats.total_value / stats.conversions : 0;
  });

  return byVariant;
}
