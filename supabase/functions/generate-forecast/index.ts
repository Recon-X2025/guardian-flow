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

    const { tenant_id, product_id, geography_levels } = await req.json();
    const correlation_id = crypto.randomUUID();

    // Enqueue forecast jobs for each geography level
    const levels = geography_levels || ['country', 'region', 'state', 'district', 'city', 'partner_hub', 'pin_code'];
    const jobs = [];

    for (const level of levels) {
      jobs.push({
        tenant_id,
        payload: {
          forecast_type: 'hierarchical',
          product_id,
          geography_level: level,
          correlation_id
        },
        status: 'queued',
        trace_id: correlation_id
      });
    }

    const { data, error } = await supabase
      .from('forecast_queue')
      .insert(jobs)
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        message: 'Forecast jobs enqueued',
        jobs: data,
        correlation_id 
      }),
      { 
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('generate-forecast error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});