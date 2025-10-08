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

  const trace_id = crypto.randomUUID();
  console.log(`[Analytics Report] Request received trace_id=${trace_id}`);

  try {
    // Verify environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Analytics Report] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { report_type, tenant_id, start_date, end_date, format = 'json' } = await req.json();

    console.log(`[Analytics Report] Processing trace_id=${trace_id} type=${report_type} tenant=${tenant_id}`);

    let data: any = null;
    let rows_count = 0;

    // Validate inputs
    if (!report_type) {
      return new Response(
        JSON.stringify({ error: 'report_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (report_type) {
      case 'operational':
        console.log('[Analytics Report] Fetching operational data...');
        let woQuery = supabase
          .from('work_orders')
          .select('*');
        
        if (tenant_id) woQuery = woQuery.eq('tenant_id', tenant_id);
        if (start_date) woQuery = woQuery.gte('created_at', start_date);
        if (end_date) woQuery = woQuery.lte('created_at', end_date);

        const { data: workOrders, error: woError } = await woQuery;
        
        if (woError) {
          console.error('[Analytics Report] Work orders error:', woError);
          throw new Error(`Failed to fetch work orders: ${woError.message}`);
        }

        data = workOrders;
        rows_count = workOrders?.length || 0;
        break;

      case 'forecast':
        console.log('[Analytics Report] Fetching forecast data...');
        let fcQuery = supabase
          .from('forecast_outputs')
          .select('*');
        
        if (tenant_id) fcQuery = fcQuery.eq('tenant_id', tenant_id);
        if (start_date) fcQuery = fcQuery.gte('target_date', start_date);
        if (end_date) fcQuery = fcQuery.lte('target_date', end_date);

        const { data: forecasts, error: fcError } = await fcQuery;
        
        if (fcError) {
          console.error('[Analytics Report] Forecast error:', fcError);
          throw new Error(`Failed to fetch forecasts: ${fcError.message}`);
        }

        data = forecasts;
        rows_count = forecasts?.length || 0;
        break;

      case 'financial':
        console.log('[Analytics Report] Fetching financial data...');
        let invQuery = supabase
          .from('invoices')
          .select('*');
        
        if (tenant_id) invQuery = invQuery.eq('tenant_id', tenant_id);
        if (start_date) invQuery = invQuery.gte('created_at', start_date);
        if (end_date) invQuery = invQuery.lte('created_at', end_date);

        const { data: invoices, error: invError } = await invQuery;
        
        if (invError) {
          console.error('[Analytics Report] Invoices error:', invError);
          throw new Error(`Failed to fetch invoices: ${invError.message}`);
        }

        data = invoices;
        rows_count = invoices?.length || 0;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown report type: ${report_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[Analytics Report] Fetched ${rows_count} rows`);

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
