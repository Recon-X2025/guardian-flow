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
      requiredPermissions: ['workorders.release'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { workOrderId, overrideToken, overrideReason } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Release requested for WO: ${workOrderId}`);

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

    // Check if already released
    if (workOrder.status === 'released' || workOrder.released_at) {
      return new Response(
        JSON.stringify({ error: 'Work order already released' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch precheck status
    const { data: precheck } = await context.supabase
      .from('work_order_prechecks')
      .select('*')
      .eq('work_order_id', workOrderId)
      .single();

    // Enforce precheck or override
    if (!precheck || !precheck.can_release) {
      // Check for valid override
      if (!overrideToken) {
        return new Response(
          JSON.stringify({
            error: 'Precheck failed - override required',
            code: 'precheck_failed',
            can_release: false,
            precheck_status: {
              inventory: precheck?.inventory_status,
              warranty: precheck?.warranty_status,
              photos: precheck?.photo_status
            },
            required_action: 'mfa_override'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify MFA override token
      const { data: mfaToken, error: mfaError } = await context.supabase
        .from('mfa_tokens')
        .select('*')
        .eq('id', overrideToken)
        .eq('user_id', context.user.id)
        .eq('action_type', 'workorder_release_override')
        .is('used_at', null)
        .single();

      if (mfaError || !mfaToken) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired override token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check MFA token expiration
      if (new Date(mfaToken.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Override token expired' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark MFA token as used
      await context.supabase
        .from('mfa_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', overrideToken);

      // Update precheck with override
      await context.supabase
        .from('work_order_prechecks')
        .update({
          override_by: context.user.id,
          override_mfa_token: overrideToken,
          override_reason: overrideReason || 'Emergency override',
          can_release: true
        })
        .eq('work_order_id', workOrderId);

      console.log(`[${correlationId}] Override applied with MFA token: ${overrideToken}`);
    }

    // Determine repair type based on warranty
    let repairType = 'out_of_warranty';
    if (workOrder.warranty_checked && workOrder.warranty_result) {
      const warrantyResult = typeof workOrder.warranty_result === 'string' 
        ? JSON.parse(workOrder.warranty_result) 
        : workOrder.warranty_result;
      
      if (warrantyResult.covered === true) {
        repairType = 'in_warranty';
      }
    }

    // Release work order with repair type
    const { error: releaseError } = await context.supabase
      .from('work_orders')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        repair_type: repairType
      })
      .eq('id', workOrderId);

    if (releaseError) throw releaseError;

    console.log(`[${correlationId}] Work order released as ${repairType} repair`);

    // Automatically trigger offer generation
    console.log(`[${correlationId}] Triggering automatic offer generation...`);
    try {
      // Fetch customer_id from ticket
      const { data: ticket } = await context.supabase
        .from('tickets')
        .select('customer_id')
        .eq('id', workOrder.ticket_id)
        .single();

      const { error: offerError } = await context.supabase.functions.invoke('generate-sapos-offers', {
        body: { 
          workOrderId,
          customerId: ticket?.customer_id 
        }
      });
      
      if (offerError) {
        console.error(`[${correlationId}] Offer generation failed (non-blocking):`, offerError);
      } else {
        console.log(`[${correlationId}] Offers generated automatically`);
      }
    } catch (error) {
      console.error(`[${correlationId}] Offer generation error (non-blocking):`, error);
    }

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: overrideToken ? 'workorder_released_override' : 'workorder_released',
      resourceType: 'work_order',
      resourceId: workOrderId,
      changes: {
        status: 'released',
        override_used: !!overrideToken,
        override_reason: overrideReason
      },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      reason: overrideReason,
      mfaVerified: !!overrideToken,
      correlationId: correlationId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`[${correlationId}] Work order released successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        workOrderId,
        status: 'released',
        released_at: new Date().toISOString(),
        override_used: !!overrideToken,
        correlation_id: correlationId,
        offers_auto_generated: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Release work order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
