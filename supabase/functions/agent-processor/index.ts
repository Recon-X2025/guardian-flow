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

    const MAX_CONCURRENT_LOOPS = 1; // Hardened: one at a time
    const TIMEOUT_MS = 20000;

    // Fetch pending queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('agent_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(MAX_CONCURRENT_LOOPS);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending queue items', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const item of queueItems) {
      try {
        // Mark as started
        await supabase
          .from('agent_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', item.id);

        // Log trace start
        await supabase.from('agent_trace_logs').insert({
          agent_id: item.agent_id,
          correlation_id: item.correlation_id,
          step: 'queue_processing_start',
          input: item.payload,
          status: 'started'
        });

        // Execute agent runtime with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/agent-runtime`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            agent_id: item.agent_id,
            context: item.payload,
            correlation_id: item.correlation_id
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        // Log trace completion
        await supabase.from('agent_trace_logs').insert({
          agent_id: item.agent_id,
          correlation_id: item.correlation_id,
          step: 'queue_processing_complete',
          output: result,
          status: 'completed'
        });

        // Mark as completed
        await supabase
          .from('agent_queue')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'success', result });

      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
        
        // Log trace error
        await supabase.from('agent_trace_logs').insert({
          agent_id: item.agent_id,
          correlation_id: item.correlation_id,
          step: 'queue_processing_error',
          error: errorMessage,
          status: 'error'
        });

        // Retry logic
        const newRetryCount = (item.retry_count || 0) + 1;
        
        if (newRetryCount < item.max_retries) {
          await supabase
            .from('agent_queue')
            .update({ 
              status: 'pending', 
              retry_count: newRetryCount,
              scheduled_at: new Date(Date.now() + (newRetryCount * 60000)).toISOString() // Exponential backoff
            })
            .eq('id', item.id);
          
          results.push({ id: item.id, status: 'retrying', retry_count: newRetryCount });
        } else {
          await supabase
            .from('agent_queue')
            .update({ 
              status: 'failed', 
              error_message: errorMessage,
              completed_at: new Date().toISOString() 
            })
            .eq('id', item.id);
          
          results.push({ id: item.id, status: 'failed', error: errorMessage });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent processor error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
