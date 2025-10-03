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
      requiredPermissions: ['finance.penalties.calculate'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { workOrderId, invoiceId, autoApply } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Calculating penalties for WO: ${workOrderId}`);

    // Fetch work order details
    const { data: workOrder, error: woError } = await context.supabase
      .from('work_orders')
      .select('*, tickets(*), work_order_prechecks(*)')
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      throw new Error('Work order not found');
    }

    // Fetch active penalty rules
    const { data: penaltyRules, error: rulesError } = await context.supabase
      .from('penalty_matrix')
      .select('*')
      .eq('active', true);

    if (rulesError) throw rulesError;

    const calculations: any[] = [];

    // Check for applicable penalties
    for (const rule of penaltyRules || []) {
      let shouldApply = false;
      let baseValue = 0;
      let reason = '';

      // Determine if penalty applies
      switch (rule.violation_type) {
        case 'late_completion':
          if (workOrder.completed_at && workOrder.tickets?.provisional_sla) {
            const slaDeadline = new Date(workOrder.created_at);
            const [hours] = workOrder.tickets.provisional_sla.match(/\d+/) || ['0'];
            slaDeadline.setHours(slaDeadline.getHours() + parseInt(hours));
            
            if (new Date(workOrder.completed_at) > slaDeadline) {
              shouldApply = true;
              baseValue = workOrder.cost_to_customer || 0;
              reason = `Completed ${Math.round((new Date(workOrder.completed_at).getTime() - slaDeadline.getTime()) / 3600000)}h past SLA`;
            }
          }
          break;

        case 'missing_photos':
          const precheck = workOrder.work_order_prechecks?.[0];
          if (precheck && precheck.photo_status === 'failed') {
            shouldApply = true;
            baseValue = workOrder.cost_to_customer || 0;
            reason = 'Photo validation failed';
          }
          break;

        case 'warranty_misuse':
          if (workOrder.warranty_result && workOrder.warranty_result.violations) {
            shouldApply = true;
            baseValue = workOrder.cost_to_customer || 0;
            reason = 'Warranty coverage violation detected';
          }
          break;

        case 'parts_discrepancy':
          if (workOrder.parts_reserved && workOrder.warranty_result) {
            const partsIssues = workOrder.warranty_result.parts_coverage?.filter((p: any) => p.discrepancy);
            if (partsIssues && partsIssues.length > 0) {
              shouldApply = true;
              baseValue = partsIssues.reduce((sum: number, p: any) => sum + (p.estimated_price || 0), 0);
              reason = `Parts discrepancy: ${partsIssues.length} items`;
            }
          }
          break;
      }

      if (shouldApply) {
        // Calculate penalty amount
        let penaltyAmount = 0;
        
        if (rule.calculation_method === 'percentage') {
          penaltyAmount = baseValue * (rule.percentage_value / 100);
        } else if (rule.calculation_method === 'fixed') {
          penaltyAmount = rule.percentage_value; // For fixed, percentage_value stores the fixed amount
        }

        // Store calculation
        const { data: calculation, error: calcError } = await context.supabase
          .from('penalty_calculations')
          .insert({
            work_order_id: workOrderId,
            invoice_id: invoiceId || null,
            penalty_code: rule.penalty_code,
            base_value: baseValue,
            calculated_amount: penaltyAmount,
            calculation_details: {
              rule_id: rule.id,
              violation_type: rule.violation_type,
              severity: rule.severity_level,
              calculation_method: rule.calculation_method,
              percentage_value: rule.percentage_value,
              reason: reason
            },
            applied: false
          })
          .select()
          .single();

        if (calcError) {
          console.error('Error storing calculation:', calcError);
        } else {
          calculations.push(calculation);
        }

        // Auto-apply if requested and allowed
        if (autoApply && rule.auto_bill) {
          await context.supabase
            .from('penalty_applications')
            .insert({
              work_order_id: workOrderId,
              penalty_code: rule.penalty_code,
              amount: penaltyAmount,
              reason: reason,
              disputed: false
            });

          await context.supabase
            .from('penalty_calculations')
            .update({ applied: true, applied_at: new Date().toISOString(), applied_by: context.user.id })
            .eq('id', calculation.id);

          console.log(`[${correlationId}] Auto-applied penalty: ${rule.penalty_code}`);
        }
      }
    }

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'penalties_calculated',
      resourceType: 'work_order',
      resourceId: workOrderId,
      changes: { calculations_count: calculations.length, auto_applied: autoApply },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      correlationId,
    });

    console.log(`[${correlationId}] Penalties calculated. Count: ${calculations.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        work_order_id: workOrderId,
        calculations,
        total_penalty_amount: calculations.reduce((sum, c) => sum + c.calculated_amount, 0),
        auto_applied: autoApply,
        correlation_id: correlationId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Calculate penalties error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
