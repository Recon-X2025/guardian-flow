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

    console.log('Forecast worker: processing queued jobs');

    const { data: jobs, error: fetchError } = await supabase
      .from('forecast_queue')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    for (const job of jobs) {
      try {
        await supabase
          .from('forecast_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', job.id);

        await processJob(supabase, job);
        results.push({ jobId: job.id, success: true });

        await supabase
          .from('forecast_queue')
          .update({ status: 'completed', finished_at: new Date().toISOString() })
          .eq('id', job.id);

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        results.push({ jobId: job.id, success: false, error: String(error) });

        await supabase
          .from('forecast_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Worker run completed',
        processed: jobs.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forecast worker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processJob(supabase: any, job: any) {
  console.log('Processing hierarchical forecast job:', job.id);

  const { product_id, geography_level, correlation_id } = job.payload;

  const { data: model } = await supabase
    .from('forecast_models')
    .select('*')
    .eq('model_type', 'hierarchical')
    .eq('hierarchy_level', geography_level)
    .eq('active', true)
    .maybeSingle();

  if (!model) {
    console.log('No active model found for level:', geography_level, '- proceeding with naive forecast');
    // proceed with naive forecast when no active model is configured
  }

  const { data: geoKeys } = await supabase
    .from('geography_hierarchy')
    .select('geography_key, country, region, state, district, city, partner_hub, pin_code')
    .not(geography_level, 'is', null);

  const forecastOutputs = [];

  for (const geo of geoKeys || []) {
    let historicalData;
    
    if (geography_level === 'pin_code') {
      historicalData = await fetchDataByPinCode(supabase, job.tenant_id, product_id, geo.pin_code);
    } else if (geography_level === 'partner_hub') {
      historicalData = await fetchDataByHub(supabase, job.tenant_id, product_id, geo.partner_hub);
    } else if (geography_level === 'city') {
      historicalData = await fetchDataByCity(supabase, job.tenant_id, product_id, geo.city);
    } else {
      historicalData = await fetchDataByLevel(supabase, job.tenant_id, product_id, geography_level, geo[geography_level]);
    }

    if (!historicalData || historicalData.length < 14) {
      console.log(`Insufficient data for ${geography_level}: ${geo.geography_key}`);
      continue;
    }

    const forecast = generateSimpleForecast(historicalData, 90);

    for (const point of forecast) {
      forecastOutputs.push({
        tenant_id: job.tenant_id,
        product_id,
        country: geo.country,
        region: geo.region,
        state: geo.state,
        district: geo.district,
        city: geo.city,
        partner_hub: geo.partner_hub,
        pin_code: geo.pin_code,
        geography_level,
        geography_key: geo.geography_key,
        forecast_type: 'volume',
        target_date: point.date,
        value: point.value,
        lower_bound: point.lower,
        upper_bound: point.upper,
        confidence_lower: point.lower,
        confidence_upper: point.upper,
        model_id: model?.id ?? null,
        metadata: { correlation_id }
      });
    }
  }

  if (forecastOutputs.length > 0) {
    const { error: insertError } = await supabase
      .from('forecast_outputs')
      .insert(forecastOutputs);

    if (insertError) throw insertError;
    console.log(`Inserted ${forecastOutputs.length} forecast points for ${geography_level}`);
  }
}

async function fetchDataByPinCode(supabase: any, tenant_id: string, product_id: string, pin_code: string) {
  const { data } = await supabase
    .from('work_orders')
    .select('created_at')
    .eq('product_id', product_id)
    .eq('pin_code', pin_code)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  return aggregateByDay(data);
}

async function fetchDataByHub(supabase: any, tenant_id: string, product_id: string, hub: string) {
  const { data } = await supabase
    .from('work_orders')
    .select('created_at')
    .eq('product_id', product_id)
    .eq('partner_hub', hub)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  return aggregateByDay(data);
}

async function fetchDataByCity(supabase: any, tenant_id: string, product_id: string, city: string) {
  const { data } = await supabase
    .from('work_orders')
    .select('created_at')
    .eq('product_id', product_id)
    .eq('city', city)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  return aggregateByDay(data);
}

async function fetchDataByLevel(supabase: any, tenant_id: string, product_id: string, level: string, value: string) {
  const { data } = await supabase
    .from('work_orders')
    .select('created_at')
    .eq('product_id', product_id)
    .eq(level, value)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  return aggregateByDay(data);
}

function aggregateByDay(data: any[]) {
  const daily = new Map();
  for (const row of data || []) {
    const date = row.created_at.split('T')[0];
    daily.set(date, (daily.get(date) || 0) + 1);
  }
  return Array.from(daily.entries()).map(([date, count]) => ({ date, value: count }));
}

function generateSimpleForecast(historical: any[], daysAhead: number) {
  if (historical.length === 0) {
    const avg = 100;
    const forecast = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < daysAhead; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        value: avg,
        lower: Math.round(avg * 0.8),
        upper: Math.round(avg * 1.2)
      });
    }
    return forecast;
  }

  const values = historical.map(h => h.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / values.length);
  const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;

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