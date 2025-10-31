import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[ops-agent-processor] 🤖 Starting automated agent run');

    // Check if agent auto-release is enabled
    const { data: toggle } = await supabase
      .from('feature_toggles')
      .select('enabled')
      .eq('feature_key', 'agent_ops_autonomous')
      .single();

    if (!toggle?.enabled) {
      console.log('[ops-agent-processor] Agent auto-release disabled');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Agent disabled', 
        prechecks_run: 0,
        work_orders_released: 0 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('[ops-agent-processor] ✅ Agent enabled - starting automated workflow');

    // STEP 1: Find work orders that need prechecks (no precheck exists yet)
    const { data: needsPrecheckWOs } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, tenant_id')
      .in('status', ['pending_validation', 'draft'])
      .limit(5); // Process 5 at a time to avoid overload

    let precheckCount = 0;
    const precheckPromises = [];

    // Filter out WOs that already have prechecks
    for (const wo of needsPrecheckWOs || []) {
      const { data: existingPrecheck } = await supabase
        .from('work_order_prechecks')
        .select('id')
        .eq('work_order_id', wo.id)
        .maybeSingle();

      if (!existingPrecheck) {
        console.log(`[ops-agent-processor] 🔍 Running automated precheck for WO ${wo.wo_number}`);
        
        // Run precheck asynchronously
        const precheckPromise = supabase.functions.invoke('precheck-orchestrator', {
          body: { workOrderId: wo.id }
        }).then(({ error }) => {
          if (error) {
            console.error(`[ops-agent-processor] ❌ Precheck failed for WO ${wo.wo_number}:`, error);
            // Log failure
            return supabase.from('events_log').insert({
              event_type: 'agent_precheck_failed',
              event_id: crypto.randomUUID(),
              entity_type: 'work_order',
              entity_id: wo.id,
              agent_id: 'ops_agent_autonomous',
              payload: { wo_number: wo.wo_number, error: error.message, tenant_id: wo.tenant_id }
            });
          } else {
            console.log(`[ops-agent-processor] ✅ Precheck completed for WO ${wo.wo_number}`);
            precheckCount++;
            // Log success
            return supabase.from('events_log').insert({
              event_type: 'agent_precheck_completed',
              event_id: crypto.randomUUID(),
              entity_type: 'work_order',
              entity_id: wo.id,
              agent_id: 'ops_agent_autonomous',
              payload: { wo_number: wo.wo_number, tenant_id: wo.tenant_id }
            });
          }
        }).catch(err => {
          console.error(`[ops-agent-processor] Exception during precheck for WO ${wo.wo_number}:`, err);
        });

        precheckPromises.push(precheckPromise);
      }
    }

    // Wait for all prechecks to complete
    await Promise.all(precheckPromises);

    // STEP 2: Find work orders that passed precheck and can be auto-released
    const { data: eligibleWOs } = await supabase
      .from('work_orders')
      .select(`
        *,
        work_order_prechecks!inner(can_release, inventory_status, warranty_status)
      `)
      .in('status', ['pending_validation', 'draft'])
      .eq('work_order_prechecks.can_release', true)
      .limit(10);

    console.log(`[ops-agent-processor] 📋 Found ${eligibleWOs?.length || 0} work orders ready for auto-release`);

    let releasedCount = 0;

    for (const wo of eligibleWOs || []) {
      try {
        console.log(`[ops-agent-processor] 🚀 Auto-releasing WO ${wo.wo_number} (tenant: ${wo.tenant_id})`);

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
            released_by: 'ops_agent',
            tenant_id: wo.tenant_id,
            timestamp: new Date().toISOString()
          },
          metadata: {
            inventory_status: wo.work_order_prechecks?.inventory_status,
            warranty_status: wo.work_order_prechecks?.warranty_status
          }
        });

        // Create notification
        const notifResult = await supabase.from('notifications').insert({
          tenant_id: wo.tenant_id,
          title: "Work Order Auto-Released",
          message: `Work order ${wo.wo_number} has been automatically released to field by the Ops Agent.`,
          type: "info",
          entity_type: "work_order",
          entity_id: wo.id,
        });
        
        if (notifResult.error) {
          console.error('[ops-agent-processor] Notification insert failed:', notifResult.error);
        }

        releasedCount++;
      } catch (error: any) {
        console.error(`[ops-agent-processor] ❌ Error releasing WO ${wo.id}:`, error.message);
        
        // Log release failure
        await supabase.from('events_log').insert({
          event_type: 'agent_release_failed',
          event_id: crypto.randomUUID(),
          entity_type: 'work_order',
          entity_id: wo.id,
          agent_id: 'ops_agent_autonomous',
          payload: {
            wo_number: wo.wo_number,
            error: error.message,
            tenant_id: wo.tenant_id
          }
        });
      }
    }

    const summary = {
      success: true,
      prechecks_run: precheckCount,
      work_orders_released: releasedCount,
      message: `Agent processed ${precheckCount} prechecks and auto-released ${releasedCount} work orders`,
      timestamp: new Date().toISOString()
    };

    console.log('[ops-agent-processor] 📊 Summary:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error: any) {
    console.error('[ops-agent-processor] 💥 Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
