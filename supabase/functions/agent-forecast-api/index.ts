import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-correlation-id, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const INTERNAL_API_SECRET = Deno.env.get('INTERNAL_API_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const incomingSecret = req.headers.get('x-internal-secret');
    if (!incomingSecret || incomingSecret !== INTERNAL_API_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = req.headers.get('x-tenant-id');
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    const { action, data } = await req.json();

    console.log(`[Forecast API] Action: ${action}, Tenant: ${tenantId}, Correlation: ${correlationId}`);

    let result;
    switch (action) {
      case 'generate_forecast':
        result = await generateForecast(supabase, tenantId!, data);
        break;
      case 'get_forecasts':
        result = await getForecasts(supabase, tenantId!, data);
        break;
      case 'get_forecast_metrics':
        result = await getForecastMetrics(supabase, tenantId!, data);
        break;
      case 'get_forecast_status':
        result = await getForecastStatus(supabase, tenantId!);
        break;
      case 'reconcile_forecast':
        result = await reconcileForecast(supabase, data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseTime = Date.now() - startTime;
    return new Response(JSON.stringify({ success: true, data: result, correlation_id: correlationId, response_time_ms: responseTime }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Response-Time': `${responseTime}ms` },
    });

  } catch (error: any) {
    console.error('[Forecast API] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateForecast(supabase: any, tenantId: string, data: any) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-forecast`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, ...data }),
  });
  return await response.json();
}

async function getForecasts(supabase: any, tenantId: string, filters: any = {}) {
  let query = supabase.from('forecast_outputs').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('target_date', { ascending: false });
  if (filters.forecast_type) query = query.eq('forecast_type', filters.forecast_type);
  if (filters.geography_level) query = query.eq('geography_level', filters.geography_level);
  if (filters.geography_key) query = query.eq('geography_key', filters.geography_key);
  if (filters.product_id) query = query.eq('product_id', filters.product_id);
  if (filters.from_date) query = query.gte('target_date', filters.from_date);
  if (filters.to_date) query = query.lte('target_date', filters.to_date);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error, count } = await query;
  if (error) throw error;
  if (filters.group_by_hierarchy) {
    const grouped = groupByHierarchy(data);
    return { forecasts: grouped, total: count };
  }
  return { forecasts: data, total: count };
}

async function getForecastMetrics(supabase: any, tenantId: string, filters: any = {}) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-forecast-metrics`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, ...filters }),
  });
  return await response.json();
}

async function getForecastStatus(supabase: any, tenantId: string) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/forecast-status`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId }),
  });
  return await response.json();
}

async function reconcileForecast(supabase: any, data: any) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/reconcile-forecast`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await response.json();
}

function groupByHierarchy(forecasts: any[]): any {
  const hierarchy: any = { country: {}, region: {}, state: {}, district: {}, city: {}, pin_code: {} };
  forecasts.forEach(f => {
    const level = f.geography_level || 'country';
    const key = f.geography_key || 'unknown';
    if (!hierarchy[level][key]) {
      hierarchy[level][key] = { geography_key: key, geography_level: level, forecasts: [], total_value: 0, avg_confidence: 0 };
    }
    hierarchy[level][key].forecasts.push(f);
    hierarchy[level][key].total_value += Number(f.value);
  });
  Object.keys(hierarchy).forEach(level => {
    Object.keys(hierarchy[level]).forEach(key => {
      const group = hierarchy[level][key];
      group.avg_confidence = group.forecasts.reduce((sum: number, f: any) => sum + (Number(f.confidence_upper) + Number(f.confidence_lower)) / 2, 0) / group.forecasts.length;
    });
  });
  return hierarchy;
}
