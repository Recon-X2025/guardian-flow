import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate internal secret for worker operations
  const internalSecret = req.headers.get('x-internal-secret');
  const expectedSecret = Deno.env.get('INTERNAL_API_SECRET');
  
  if (!internalSecret || internalSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process queued agent tasks
    const { data: tasks } = await supabase
      .from('agent_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    for (const task of tasks || []) {
      await supabase
        .from('agent_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', task.id);

      try {
        // Fetch hierarchical forecast context if available
        let forecastContext = null;
        if (task.payload?.geography_key && task.payload?.product_id) {
          const { data: forecast } = await supabase
            .from('forecast_outputs')
            .select('*')
            .eq('geography_key', task.payload.geography_key)
            .eq('product_id', task.payload.product_id)
            .eq('forecast_type', 'volume')
            .gte('target_date', new Date().toISOString().split('T')[0])
            .order('target_date')
            .limit(7);
          
          forecastContext = forecast;
        }

        await supabase.functions.invoke('agent-runtime', {
          body: {
            agent_id: task.agent_id,
            action: task.action_type,
            parameters: {
              ...task.payload,
              forecast_context: forecastContext
            }
          }
        });

        await supabase
          .from('agent_queue')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', task.id);
      } catch (error: any) {
        await supabase
          .from('agent_queue')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: tasks?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Agent worker error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal processing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
