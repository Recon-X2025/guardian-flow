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

    const { report_type, tenant_id, start_date, end_date, format = 'json' } = await req.json();
    const trace_id = crypto.randomUUID();

    console.log(`[Analytics Report] trace_id=${trace_id} type=${report_type} tenant=${tenant_id}`);

    let data: any = null;
    let rows_count = 0;

    switch (report_type) {
      case 'operational':
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('*')
          .eq('tenant_id', tenant_id)
          .gte('created_at', start_date)
          .lte('created_at', end_date);
        data = workOrders;
        rows_count = workOrders?.length || 0;
        break;

      case 'forecast':
        const { data: forecasts } = await supabase
          .from('forecast_outputs')
          .select('*')
          .eq('tenant_id', tenant_id)
          .gte('target_date', start_date)
          .lte('target_date', end_date);
        data = forecasts;
        rows_count = forecasts?.length || 0;
        break;

      case 'financial':
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', tenant_id)
          .gte('created_at', start_date)
          .lte('created_at', end_date);
        data = invoices;
        rows_count = invoices?.length || 0;
        break;

      default:
        throw new Error(`Unknown report type: ${report_type}`);
    }

    // Log to audit table
    await supabase.from('report_audit').insert({
      report_type,
      tenant_id,
      generated_at: new Date().toISOString(),
      rows_count,
      status: 'success',
      trace_id,
      metadata: { format, start_date, end_date }
    });

    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report_type}_${tenant_id}_${new Date().toISOString()}.csv"`
        }
      });
    }

    return new Response(
      JSON.stringify({
        trace_id,
        report_type,
        tenant_id,
        rows_count,
        data,
        generated_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[Analytics Report] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}
