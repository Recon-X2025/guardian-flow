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
      requiredPermissions: ['workorders.complete'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { workOrderId } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Completion requested for WO: ${workOrderId}`);

    // Fetch work order
    const { data: workOrder, error: woError } = await context.supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      return new Response(
        JSON.stringify({ error: 'Work order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed
    if (workOrder.status === 'completed' || workOrder.completed_at) {
      return new Response(
        JSON.stringify({ error: 'Work order already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate prechecks before completion
    const { data: precheck } = await context.supabase
      .from('work_order_prechecks')
      .select('*')
      .eq('work_order_id', workOrderId)
      .single();

    // Validate photo uploads - must have all required stages
    const { data: photoValidations } = await context.supabase
      .from('photo_validations')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('photos_validated', true)
      .eq('anomaly_detected', false);

    const requiredStages = ['replacement', 'post_repair', 'pickup'];
    const validatedStages = (photoValidations || []).map(pv => pv.stage);
    const allPhotosValid = requiredStages.every(stage => validatedStages.includes(stage));

    if (!allPhotosValid) {
      return new Response(
        JSON.stringify({
          error: 'Cannot complete work order - photo validation incomplete',
          code: 'photos_incomplete',
          missing_stages: requiredStages.filter(s => !validatedStages.includes(s)),
          validated_stages: validatedStages
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate parts if parts were reserved
    if (workOrder.parts_reserved && (!precheck || precheck.inventory_status !== 'passed')) {
      return new Response(
        JSON.stringify({
          error: 'Cannot complete work order - parts validation incomplete',
          code: 'parts_incomplete',
          inventory_status: precheck?.inventory_status
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Complete work order
    const { error: completeError } = await context.supabase
      .from('work_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', workOrderId);

    if (completeError) throw completeError;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'workorder_completed',
      resourceType: 'work_order',
      resourceId: workOrderId,
      changes: {
        status: 'completed',
        photos_validated: true,
        parts_validated: workOrder.parts_reserved
      },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      correlationId: correlationId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`[${correlationId}] Work order completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        workOrderId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        correlation_id: correlationId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Complete work order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
