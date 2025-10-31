import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeError } from '../_shared/error-sanitizer.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('x-api-key');
    
    let tenantId: string | null = null;

    if (apiKey) {
      // Validate API key
      const { data: keyData } = await supabase
        .from('tenant_api_keys')
        .select('tenant_id, rate_limit, last_used_at')
        .eq('api_key', apiKey)
        .eq('status', 'active')
        .single();

      if (!keyData) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      tenantId = keyData.tenant_id;

      // Update last used timestamp
      await supabase
        .from('tenant_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('api_key', apiKey);

    } else if (authHeader) {
      // Verify JWT
      const jwt = authHeader.replace('Bearer ', '');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      tenantId = profile?.tenant_id || null;
    } else {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { dataset, format = 'json', filters = {} } = await req.json();

    // Fetch data based on dataset type
    let data;
    switch (dataset) {
      case 'sla_metrics':
        data = await fetchSLAMetrics(supabase, tenantId, filters);
        break;
      case 'financial_data':
        data = await fetchFinancialData(supabase, tenantId, filters);
        break;
      case 'forecast_accuracy':
        data = await fetchForecastAccuracy(supabase, tenantId, filters);
        break;
      case 'fraud_analytics':
        data = await fetchFraudAnalytics(supabase, tenantId, filters);
        break;
      case 'operational_metrics':
        data = await fetchOperationalMetrics(supabase, tenantId, filters);
        break;
      case 'workforce_analytics':
        data = await fetchWorkforceAnalytics(supabase, tenantId, filters);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid dataset type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Format response
    const response = formatData(data, format);

    // Log export
    await supabase
      .from('analytics_exports')
      .insert({
        tenant_id: tenantId,
        dataset,
        format,
        record_count: Array.isArray(data) ? data.length : 0,
        correlation_id: correlationId
      });

    return new Response(response, {
      headers: {
        ...corsHeaders,
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'X-Correlation-ID': correlationId
      }
    });

  } catch (error: any) {
    console.error('[Analytics Export] Error:', error);
    const sanitized = sanitizeError(error, correlationId);
    return new Response(
      JSON.stringify(sanitized),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchSLAMetrics(supabase: any, tenantId: string, filters: any) {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      id,
      wo_number,
      status,
      created_at,
      completed_at,
      tickets!inner(provisional_sla)
    `)
    .eq('tickets.tenant_id', tenantId)
    .gte('created_at', filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  return data?.map((wo: any) => ({
    work_order: wo.wo_number,
    created_at: wo.created_at,
    completed_at: wo.completed_at,
    sla: wo.tickets?.provisional_sla,
    status: wo.status,
    sla_met: wo.completed_at ? 
      (new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime()) < parseSLA(wo.tickets?.provisional_sla) :
      null
  }));
}

async function fetchFinancialData(supabase: any, tenantId: string, filters: any) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const { data: penalties } = await supabase
    .from('applied_penalties')
    .select('*')
    .gte('created_at', filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return {
    invoices: invoices || [],
    penalties: penalties || [],
    summary: {
      total_revenue: invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0,
      total_penalties: penalties?.reduce((sum: number, pen: any) => sum + (pen.penalty_amount || 0), 0) || 0
    }
  };
}

async function fetchForecastAccuracy(supabase: any, tenantId: string, filters: any) {
  const { data } = await supabase
    .from('forecast_outputs')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('target_date', filters.start_date || new Date().toISOString().split('T')[0])
    .order('target_date');

  return data;
}

async function fetchFraudAnalytics(supabase: any, tenantId: string, filters: any) {
  const { data } = await supabase
    .from('fraud_alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('detected_at', filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('detected_at', { ascending: false });

  return data;
}

async function fetchOperationalMetrics(supabase: any, tenantId: string, filters: any) {
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`
      *,
      tickets!inner(tenant_id, symptom)
    `)
    .eq('tickets.tenant_id', tenantId)
    .gte('created_at', filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return workOrders;
}

async function fetchWorkforceAnalytics(supabase: any, tenantId: string, filters: any) {
  const { data: technicians } = await supabase
    .from('technicians')
    .select(`
      *,
      work_orders(count)
    `)
    .eq('tenant_id', tenantId);

  return technicians;
}

function formatData(data: any, format: string): string {
  if (format === 'csv') {
    return convertToCSV(data);
  }
  return JSON.stringify(data, null, 2);
}

function convertToCSV(data: any): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    }).map(v => `"${v}"`).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function parseSLA(slaInterval: string): number {
  if (!slaInterval) return 24 * 60 * 60 * 1000;
  const match = slaInterval.match(/(\d+)\s*(hour|day|minute)/i);
  if (!match) return 24 * 60 * 60 * 1000;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'minute': return value * 60 * 1000;
    case 'hour': return value * 60 * 60 * 1000;
    case 'day': return value * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}
