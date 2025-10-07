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

    const { forecast_type, tenant_id, days_ahead = 30 } = await req.json();

    console.log('Generating forecast:', { forecast_type, tenant_id, days_ahead });

    // Fetch active model for this forecast type
    const { data: model } = await supabase
      .from('forecast_models')
      .select('*')
      .eq('model_type', forecast_type)
      .eq('active', true)
      .single();

    if (!model) {
      return new Response(
        JSON.stringify({ error: 'No active model found for forecast type' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch historical data based on forecast type
    let historicalData: Array<{ date: string; value: number }> = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12); // 12 months lookback

    switch (forecast_type) {
      case 'engineer_shrinkage':
        historicalData = await fetchEngineerAvailability(supabase, tenant_id, startDate, endDate);
        break;
      case 'repair_volume':
        historicalData = await fetchRepairVolume(supabase, tenant_id, startDate, endDate);
        break;
      case 'spend_revenue':
        historicalData = await fetchFinancials(supabase, tenant_id, startDate, endDate);
        break;
    }

    // Generate forecast using simple trend analysis
    const forecast = generateSimpleForecast(historicalData, days_ahead, model);

    // Store forecast outputs
    const outputs = forecast.map(point => ({
      model_id: model.id,
      forecast_type,
      target_date: point.date,
      value: point.value,
      confidence_lower: point.lower,
      confidence_upper: point.upper,
      tenant_id,
      metadata: { algorithm: model.algorithm, generated_at: new Date().toISOString() }
    }));

    const { error: insertError } = await supabase
      .from('forecast_outputs')
      .insert(outputs);

    if (insertError) {
      console.error('Error storing forecast:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        model: model.model_name,
        forecast_type,
        points: forecast.length,
        data: forecast
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forecast engine error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchEngineerAvailability(supabase: any, tenant_id: string, startDate: Date, endDate: Date) {
  // Aggregate work order assignments per day
  const { data } = await supabase
    .from('work_orders')
    .select('created_at, technician_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const dailyCount: Record<string, number> = {};
  data?.forEach((wo: any) => {
    const date = new Date(wo.created_at).toISOString().split('T')[0];
    dailyCount[date] = (dailyCount[date] || 0) + 1;
  });

  return Object.entries(dailyCount).map(([date, count]) => ({ date, value: count }));
}

async function fetchRepairVolume(supabase: any, tenant_id: string, startDate: Date, endDate: Date) {
  const { data } = await supabase
    .from('work_orders')
    .select('created_at, status')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const dailyCount: Record<string, number> = {};
  data?.forEach((wo: any) => {
    const date = new Date(wo.created_at).toISOString().split('T')[0];
    dailyCount[date] = (dailyCount[date] || 0) + 1;
  });

  return Object.entries(dailyCount).map(([date, count]) => ({ date, value: count }));
}

async function fetchFinancials(supabase: any, tenant_id: string, startDate: Date, endDate: Date) {
  const { data } = await supabase
    .from('invoices')
    .select('created_at, total_amount')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const dailySum: Record<string, number> = {};
  data?.forEach((inv: any) => {
    const date = new Date(inv.created_at).toISOString().split('T')[0];
    dailySum[date] = (dailySum[date] || 0) + Number(inv.total_amount);
  });

  return Object.entries(dailySum).map(([date, value]) => ({ date, value }));
}

function generateSimpleForecast(historical: any[], daysAhead: number, model: any) {
  if (historical.length === 0) {
    return [];
  }

  // Calculate simple moving average
  const values = historical.map(h => h.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / values.length);

  // Calculate trend
  const trend = values.length > 1 
    ? (values[values.length - 1] - values[0]) / values.length 
    : 0;

  // Generate forecast points
  const forecast = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < daysAhead; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    const value = avg + (trend * i);
    const lower = value - (1.96 * stdDev);
    const upper = value + (1.96 * stdDev);

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      value: Math.max(0, Math.round(value)),
      lower: Math.max(0, Math.round(lower)),
      upper: Math.round(upper)
    });
  }

  return forecast;
}