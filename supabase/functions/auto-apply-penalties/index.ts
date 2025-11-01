import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { workOrderId, violationType } = await req.json();

    console.log('Auto-applying penalties for WO:', workOrderId, 'Type:', violationType);

    // Get work order details
    const { data: wo, error: woError } = await supabaseClient
      .from('work_orders')
      .select('*, invoice:invoices(*)')
      .eq('id', workOrderId)
      .single();

    if (woError) throw woError;

    // Get applicable penalty rules
    const { data: penaltyRules, error: rulesError } = await supabaseClient
      .from('penalty_matrix')
      .select('*')
      .eq('active', true)
      .eq('auto_bill', true)
      .eq('violation_type', violationType);

    if (rulesError) throw rulesError;

    const appliedPenalties = [];

    for (const rule of penaltyRules) {
      // Calculate penalty amount based on rule
      let baseAmount = 0;
      
      if (rule.base_reference === 'wo_total') {
        baseAmount = Number(wo.total_amount || 0);
      } else if (rule.base_reference === 'parts_cost') {
        baseAmount = Number(wo.parts_cost || 0);
      } else if (rule.base_reference === 'labor_cost') {
        baseAmount = Number(wo.labor_cost || 0);
      }

      const penaltyAmount = (baseAmount * Number(rule.percentage_value)) / 100;

      // Create penalty record
      const { data: penalty, error: penaltyError } = await supabaseClient
        .from('penalty_adjustments')
        .insert({
          work_order_id: workOrderId,
          penalty_code: rule.penalty_code,
          violation_type: rule.violation_type,
          severity_level: rule.severity_level,
          amount: penaltyAmount,
          status: 'applied',
          auto_applied: true,
          applied_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!penaltyError) {
        appliedPenalties.push(penalty);

        // Update invoice if exists
        if (wo.invoice) {
          const newPenaltiesTotal = Number(wo.invoice.penalties || 0) + penaltyAmount;
          const newTotalAmount = Number(wo.invoice.subtotal) - newPenaltiesTotal;

          await supabaseClient
            .from('invoices')
            .update({
              penalties: newPenaltiesTotal,
              total_amount: newTotalAmount
            })
            .eq('id', wo.invoice.id);
        }
      }
    }

    // Log to audit trail
    await supabaseClient.from('audit_trail').insert({
      action: 'penalties_auto_applied',
      resource_type: 'work_order',
      resource_id: workOrderId,
      details: {
        violationType,
        appliedPenalties: appliedPenalties.length,
        timestamp: new Date().toISOString()
      }
    });

    console.log('Applied', appliedPenalties.length, 'penalties');

    return new Response(
      JSON.stringify({
        success: true,
        appliedPenalties,
        count: appliedPenalties.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Auto-apply penalties error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
