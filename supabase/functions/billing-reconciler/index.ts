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

    console.log('[Billing Reconciler] Starting daily reconciliation');

    // Get current billing cycle dates
    const today = new Date();
    const cycleStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id');

    if (tenantsError) throw tenantsError;

    const results = [];

    for (const tenant of tenants) {
      try {
        const result = await reconcileTenantBilling(
          supabase,
          tenant.id,
          cycleStart,
          cycleEnd
        );
        results.push(result);
      } catch (error: any) {
        console.error(`[Billing] Error for tenant ${tenant.id}:`, error);
        results.push({
          tenant_id: tenant.id,
          success: false,
          error: error.message,
        });
      }
    }

    console.log('[Billing Reconciler] Completed reconciliation');

    return new Response(
      JSON.stringify({
        success: true,
        reconciled: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Billing Reconciler] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function reconcileTenantBilling(
  supabase: any,
  tenantId: string,
  cycleStart: Date,
  cycleEnd: Date
) {
  console.log(`[Billing] Processing tenant: ${tenantId}`);

  // Get API usage logs for the current cycle
  const { data: usageLogs, error: usageError } = await supabase
    .from('api_usage_logs')
    .select('endpoint, status_code')
    .eq('tenant_id', tenantId)
    .gte('timestamp', cycleStart.toISOString())
    .lte('timestamp', cycleEnd.toISOString())
    .eq('status_code', 200); // Only count successful calls

  if (usageError) throw usageError;

  // Group by endpoint
  const endpointUsage: Record<string, number> = {};
  usageLogs?.forEach((log: any) => {
    endpointUsage[log.endpoint] = (endpointUsage[log.endpoint] || 0) + 1;
  });

  // Create or update billing records
  const billingRecords = [];
  const ratePerCall = 0.25; // ₹0.25 per call

  for (const [endpoint, apiCalls] of Object.entries(endpointUsage)) {
    const amountDue = apiCalls * ratePerCall;

    // Check if record exists
    const { data: existing } = await supabase
      .from('billing_usage')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('endpoint', endpoint)
      .eq('billing_cycle_start', cycleStart.toISOString().split('T')[0])
      .eq('billing_cycle_end', cycleEnd.toISOString().split('T')[0])
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('billing_usage')
        .update({
          api_calls: apiCalls,
          amount_due: amountDue,
        })
        .eq('id', existing.id);
    } else {
      // Insert new
      await supabase
        .from('billing_usage')
        .insert({
          tenant_id: tenantId,
          endpoint,
          api_calls: apiCalls,
          billing_cycle_start: cycleStart.toISOString().split('T')[0],
          billing_cycle_end: cycleEnd.toISOString().split('T')[0],
          rate_per_call: ratePerCall,
          amount_due: amountDue,
        });
    }

    billingRecords.push({ endpoint, api_calls: apiCalls, amount_due: amountDue });
  }

  const totalAmount = billingRecords.reduce((sum, r) => sum + r.amount_due, 0);

  console.log(`[Billing] Tenant ${tenantId}: ${usageLogs?.length || 0} calls, ₹${totalAmount.toFixed(2)}`);

  return {
    tenant_id: tenantId,
    success: true,
    total_calls: usageLogs?.length || 0,
    total_amount: totalAmount,
    endpoints: billingRecords.length,
  };
}
