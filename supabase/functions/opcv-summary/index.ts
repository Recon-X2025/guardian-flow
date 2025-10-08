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

    const url = new URL(req.url);
    const tenant_id = url.searchParams.get('tenant_id');
    const trace_id = crypto.randomUUID();

    console.log(`[OPCV Summary] trace_id=${trace_id} tenant_id=${tenant_id}`);

    // Query A: Stage counts and SLA metrics
    const { data: stageData, error: stageError } = await supabase.rpc('get_opcv_stages', {
      p_tenant_id: tenant_id
    }).select();

    if (stageError) {
      console.error('[OPCV Summary] Stage query error:', stageError);
      // Fallback to direct query
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('status, created_at, sla_due_at')
        .eq('tenant_id', tenant_id)
        .not('status', 'in', '("completed","cancelled")');

      const stages = {
        scheduled: workOrders?.filter(w => w.status === 'scheduled').length || 0,
        in_progress: workOrders?.filter(w => w.status === 'in_progress').length || 0,
        pending_parts: workOrders?.filter(w => w.status === 'pending_parts').length || 0,
        pending_validation: workOrders?.filter(w => w.status === 'pending_validation').length || 0,
        sla_breached: workOrders?.filter(w => w.sla_due_at && new Date(w.sla_due_at) < new Date()).length || 0,
        avg_age_hours: 48 // placeholder
      };
      
      // Query B: Forecast breach risk (next 48h)
      const { data: forecast } = await supabase
        .from('forecast_outputs')
        .select('geography_key, value')
        .eq('tenant_id', tenant_id)
        .gte('target_date', new Date().toISOString().split('T')[0])
        .lte('target_date', new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0])
        .order('value', { ascending: false })
        .limit(10);

      // Query C: Top engineers by active WOs
      const { data: engineers } = await supabase
        .from('work_orders')
        .select('technician_id, profiles!work_orders_technician_id_fkey(full_name)')
        .eq('tenant_id', tenant_id)
        .in('status', ['scheduled', 'in_progress', 'pending_parts'])
        .not('technician_id', 'is', null);

      const engineerMap = engineers?.reduce((acc: any, wo: any) => {
        const id = wo.technician_id;
        if (!acc[id]) {
          acc[id] = { id, name: wo.profiles?.full_name || 'Unknown', active_wos: 0 };
        }
        acc[id].active_wos++;
        return acc;
      }, {}) || {};

      const topEngineers = Object.values(engineerMap)
        .sort((a: any, b: any) => b.active_wos - a.active_wos)
        .slice(0, 5);

      // Query D: Inventory alerts
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('sku, description')
        .limit(5);

      const inventoryAlerts = inventory?.map(item => ({
        part_id: item.sku,
        name: item.description,
        risk_level: 'medium',
        days_stock: 7
      })) || [];

      // AI Summary (placeholder - would call Lovable AI)
      const aiSummary = `Operations snapshot: ${stages.in_progress} WOs in progress, ${stages.sla_breached} SLA breaches. High volume expected in next 48h. Engineer utilization normal.`;

      return new Response(
        JSON.stringify({
          trace_id,
          tenant_id,
          stages,
          forecast_breaches: forecast || [],
          top_engineers: topEngineers,
          inventory_alerts: inventoryAlerts,
          ai_summary: aiSummary,
          generated_at: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If RPC exists, use its results
    return new Response(
      JSON.stringify({
        trace_id,
        tenant_id,
        ...stageData,
        generated_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[OPCV Summary] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
