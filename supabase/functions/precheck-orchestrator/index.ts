import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['workorders.precheck'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { workOrderId } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Starting precheck orchestration for WO: ${workOrderId}`);

    // Get work order details
    const { data: workOrder, error: woError } = await context.supabase
      .from('work_orders')
      .select('*, tickets(unit_serial, customer_id)')
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      throw new Error('Work order not found');
    }

    // Initialize or get precheck record
    const { data: precheck, error: precheckError } = await context.supabase
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
    const { data: inventoryResult, error: invError } = await context.supabase.functions.invoke('check-inventory', {
      body: {
        parts: workOrder.parts_reserved ? JSON.parse(workOrder.warranty_result || '{}').parts || [] : [],
        hubId: workOrder.hub_id
      }
    });

    if (!invError && inventoryResult) {
      results.inventory = inventoryResult;
      await context.supabase.from('work_order_prechecks')
        .update({
          inventory_status: inventoryResult.all_available ? 'passed' : 'failed',
          inventory_result: inventoryResult
        })
        .eq('id', precheck.id);
    }

    // STEP 2: Warranty Check
    console.log(`[${correlationId}] Running warranty check...`);
    const { data: warrantyResult, error: warError } = await context.supabase.functions.invoke('check-warranty', {
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

      await context.supabase.from('work_orders').update({ cost_to_customer: customerCost }).eq('id', workOrderId);
      await context.supabase.from('work_order_prechecks')
        .update({
          warranty_status: 'passed',
          warranty_result: warrantyResult
        })
        .eq('id', precheck.id);
    }

    // STEP 3: Photo Validation Check
    console.log(`[${correlationId}] Checking photo validations...`);
    const { data: photoValidations } = await context.supabase
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

    await context.supabase.from('work_order_prechecks')
      .update({
        photo_status: allPhotosValid ? 'passed' : 'failed',
        photo_result: results.photos
      })
      .eq('id', precheck.id);

    // Final check
    const { data: finalPrecheck } = await context.supabase
      .from('work_order_prechecks')
      .select('can_release')
      .eq('id', precheck.id)
      .single();

    results.can_release = finalPrecheck?.can_release || false;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'precheck_completed',
      resourceType: 'work_order',
      resourceId: workOrderId,
      changes: results,
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      correlationId: correlationId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
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