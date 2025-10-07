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

    // Fetch pending jobs (limit to prevent timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('forecast_queue')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase
          .from('forecast_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', job.id);

        // Process the job
        const result = await processJob(supabase, job);
        results.push({ jobId: job.id, success: true });

        // Mark as completed
        await supabase
          .from('forecast_queue')
          .update({ status: 'completed', finished_at: new Date().toISOString() })
          .eq('id', job.id);

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        results.push({ jobId: job.id, success: false, error: String(error) });

        // Mark as failed
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
  const { forecast_type, days_ahead = 30 } = job.payload;
  const tenant_id = job.tenant_id;

  // Fetch active model
  const { data: model } = await supabase
    .from('forecast_models')
    .select('*')
    .eq('model_type', forecast_type)
    .eq('active', true)
    .maybeSingle();

  if (!model) {
    console.warn('No active model, using fallback');
    return { fallback: true };
  }

  // Fetch historical data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);

  let historicalData: Array<{ date: string; value: number }> = [];

  try {
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
  } catch (e) {
    console.error('Error fetching historical data:', e);
    historicalData = [];
  }

  // Generate forecast
  const forecast = generateSimpleForecast(historicalData, days_ahead, model);

  // Store outputs
  const outputs = forecast.map(point => ({
    model_id: model.id,
    forecast_type,
    target_date: point.date,
    value: point.value,
    lower_bound: point.lower,
    upper_bound: point.upper,
    tenant_id,
    metadata: {
      algorithm: model.algorithm,
      job_id: job.id,
      trace_id: job.trace_id,
      generated_at: new Date().toISOString()
    }
  }));

  await supabase.from('forecast_outputs').insert(outputs);

  return { points: forecast.length };
}

async function fetchEngineerAvailability(supabase: any, tenant_id: string, startDate: Date, endDate: Date) {
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
    // Return naive forecast based on global average
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
