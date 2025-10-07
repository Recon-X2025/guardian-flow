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

    const { tenant_id, geography_levels, product_id } = await req.json();
    const correlation_id = crypto.randomUUID();

    // Default to all levels if not specified
    const levels = geography_levels || ['country', 'region', 'state', 'city', 'partner_hub', 'pin_code'];
    
    // Enqueue forecast jobs
    const jobs = levels.map((level: string) => ({
      tenant_id,
      payload: {
        forecast_type: 'hierarchical',
        product_id,
        geography_level: level,
        correlation_id,
        triggered_by: 'manual'
      },
      status: 'queued',
      trace_id: correlation_id
    }));

    const { data, error } = await supabase
      .from('forecast_queue')
      .insert(jobs)
      .select();

    if (error) throw error;

    // Trigger the forecast worker immediately
    const workerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/forecast-worker`;
    
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }).catch(err => console.error('Worker trigger error:', err));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Forecast jobs enqueued and worker triggered',
        jobs: data,
        correlation_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Run forecast error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
