import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workOrderId } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Starting precheck orchestration for WO: ${workOrderId}`);

    // Get work order details
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('*, tickets(unit_serial, customer_id)')
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      throw new Error('Work order not found');
    }

    // Initialize or get precheck record
    const { data: precheck, error: precheckError } = await supabase
      .from('work_order_prechecks')
      .upsert({
        work_order_id: workOrderId,
        inventory_status: 'pending',
        warranty_status: 'pending',
        photo_status: 'pending'
      }, { onConflict: 'work_order_id' })
      .select()
      .single();

    if (precheckError) throw precheckError;

    const results: any = {
      correlation_id: correlationId,
      inventory: null,
      warranty: null,
      photos: null,
      can_release: false
    };

    // STEP 1: Inventory Cascade Check
    console.log(`[${correlationId}] Running inventory cascade...`);
    const { data: inventoryResult, error: invError } = await supabase.functions.invoke('check-inventory', {
      body: {
        parts: workOrder.parts_reserved ? JSON.parse(workOrder.warranty_result || '{}').parts || [] : [],
        hubId: workOrder.hub_id
      }
    });

    if (!invError && inventoryResult) {
      results.inventory = inventoryResult;
      await supabase.from('work_order_prechecks')
        .update({
          inventory_status: inventoryResult.all_available ? 'passed' : 'failed',
          inventory_result: inventoryResult
        })
        .eq('id', precheck.id);
    }

    // STEP 2: Warranty Check
    console.log(`[${correlationId}] Running warranty check...`);
    const { data: warrantyResult, error: warError } = await supabase.functions.invoke('check-warranty', {
      body: {
        unitSerial: workOrder.tickets?.unit_serial,
        parts: workOrder.parts_reserved ? JSON.parse(workOrder.warranty_result || '{}').parts || [] : []
      }
    });

    if (!warError && warrantyResult) {
      results.warranty = warrantyResult;
      
      // Apply warranty-driven pricing
      let customerCost = 0;
      if (warrantyResult.covered && warrantyResult.parts_coverage) {
        warrantyResult.parts_coverage.forEach((pc: any) => {
          if (!pc.covered) {
            customerCost += pc.estimated_price || 0;
          }
        });
      }

      await supabase.from('work_orders').update({ cost_to_customer: customerCost }).eq('id', workOrderId);
      await supabase.from('work_order_prechecks')
        .update({
          warranty_status: 'passed',
          warranty_result: warrantyResult
        })
        .eq('id', precheck.id);
    }

    // STEP 3: Photo Validation Check
    console.log(`[${correlationId}] Checking photo validations...`);
    const { data: photoValidations } = await supabase
      .from('photo_validations')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false })
      .limit(3);

    const requiredStages = ['replacement', 'post_repair', 'pickup'];
    const validatedStages = (photoValidations || [])
      .filter(pv => pv.photos_validated && !pv.anomaly_detected)
      .map(pv => pv.stage);

    const allPhotosValid = requiredStages.every(stage => validatedStages.includes(stage));

    results.photos = {
      validated_stages: validatedStages,
      required_stages: requiredStages,
      all_valid: allPhotosValid
    };

    await supabase.from('work_order_prechecks')
      .update({
        photo_status: allPhotosValid ? 'passed' : 'failed',
        photo_result: results.photos
      })
      .eq('id', precheck.id);

    // Final check
    const { data: finalPrecheck } = await supabase
      .from('work_order_prechecks')
      .select('can_release')
      .eq('id', precheck.id)
      .single();

    results.can_release = finalPrecheck?.can_release || false;

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'precheck_completed',
      resource_type: 'work_order',
      resource_id: workOrderId,
      changes: results,
      correlation_id: correlationId
    });

    console.log(`[${correlationId}] Precheck complete. Can release: ${results.can_release}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Precheck orchestration error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});