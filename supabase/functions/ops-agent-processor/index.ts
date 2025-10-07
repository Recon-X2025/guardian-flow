import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[ops-agent-processor] Starting agent processing cycle');

    // Check if agent auto-release is enabled
    const { data: toggle } = await supabase
      .from('feature_toggles')
      .select('enabled')
      .eq('feature_key', 'agent_ops_autonomous')
      .single();

    if (!toggle?.enabled) {
      console.log('[ops-agent-processor] Agent auto-release disabled');
      return new Response(JSON.stringify({ message: 'Agent disabled', processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[ops-agent-processor] Agent auto-release enabled, processing work orders');

    // Find work orders that passed precheck and can be auto-released
    const { data: eligibleWOs } = await supabase
      .from('work_orders')
      .select(`
        *,
        work_order_prechecks!inner(can_release, inventory_status, warranty_status)
      `)
      .in('status', ['pending_validation', 'draft'])
      .eq('work_order_prechecks.can_release', true)
      .limit(10);

    let processed = 0;

    for (const wo of eligibleWOs || []) {
      try {
        console.log(`[ops-agent-processor] Auto-releasing work order: ${wo.id}`);

        // Update work order status to released
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ 
            status: 'assigned',
            released_at: new Date().toISOString()
          })
          .eq('id', wo.id);

        if (updateError) throw updateError;

        // Log the auto-release action
        await supabase.from('events_log').insert({
          event_type: 'work_order_auto_released',
          event_id: crypto.randomUUID(),
          entity_type: 'work_order',
          entity_id: wo.id,
          agent_id: 'ops_agent_autonomous',
          payload: {
            work_order_number: wo.wo_number,
            precheck_passed: true,
            released_by: 'agent'
          },
          metadata: {
            inventory_status: wo.work_order_prechecks?.inventory_status,
            warranty_status: wo.work_order_prechecks?.warranty_status
          }
        });

        processed++;
      } catch (error: any) {
        console.error(`[ops-agent-processor] Error releasing WO ${wo.id}:`, error.message);
      }
    }

    console.log(`[ops-agent-processor] Processed ${processed} work orders`);

    return new Response(JSON.stringify({ 
      message: 'Agent processing complete',
      processed,
      total_eligible: eligibleWOs?.length || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[ops-agent-processor] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
