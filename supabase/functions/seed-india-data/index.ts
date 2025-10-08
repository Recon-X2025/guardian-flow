import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for web calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// India geography data
const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const REGIONS: Record<string, string[]> = {
  'North': ['Delhi', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Ladakh', 'Punjab', 'Chandigarh', 'Uttarakhand'],
  'South': ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana', 'Puducherry', 'Lakshadweep', 'Andaman and Nicobar'],
  'East': ['Bihar', 'Jharkhand', 'Odisha', 'West Bengal'],
  'West': ['Goa', 'Gujarat', 'Maharashtra', 'Rajasthan', 'Dadra and Nagar Haveli', 'Daman and Diu'],
  'Central': ['Chhattisgarh', 'Madhya Pradesh', 'Uttar Pradesh'],
  'Northeast': ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura']
};

const PRODUCTS = [
  { category: 'PC', weight: 54 },
  { category: 'Printer', weight: 33 },
  { category: 'Accessories', weight: 10 },
  { category: 'Peripherals', weight: 3 }
];

type SeedStep = 'init' | 'process';

function findRegionForState(state: string): string {
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(state)) return region;
  }
  return 'Unknown';
}

function getSeasonalityUplift(month: number): number {
  // May (4) .. Sep (8)
  return (month >= 4 && month <= 8) ? 1.3 : 1.0;
}

function pickProduct(): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const p of PRODUCTS) {
    cumulative += p.weight;
    if (rand < cumulative) return p.category;
  }
  return 'PC';
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildStateData(
  tenant_id: string,
  state: string,
  region: string,
  startDate: Date,
  endDate: Date,
) {
  const geoData: any[] = [];
  const workOrders: any[] = [];
  let totalRecords = 0;

  // 6 hubs per state
  for (let hubIdx = 1; hubIdx <= 6; hubIdx++) {
    const partnerHub = `${state.substring(0, 3).toUpperCase()}-HUB-${hubIdx}`;

    // 2-3 pin codes per hub
    const pinCodeCount = 2 + Math.floor(Math.random() * 2);
    for (let pinIdx = 1; pinIdx <= pinCodeCount; pinIdx++) {
      const pinCode = `${100000 + Math.floor(Math.random() * 799999)}`;

      // store geography
      geoData.push({
        country: 'India',
        region,
        state,
        district: state,
        city: `${state} City ${hubIdx}`,
        partner_hub: partnerHub,
        pin_code: pinCode,
      });

      // generate work orders for 12 months
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const month = currentDate.getMonth();
        const seasonalityFactor = getSeasonalityUplift(month);

        // Base monthly volume per pin code: ~40-60 orders
        const baseMonthly = 40 + Math.floor(Math.random() * 20);
        const adjustedMonthly = Math.floor(baseMonthly * seasonalityFactor);

        for (let i = 0; i < adjustedMonthly; i++) {
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const randomDay = randomInt(1, daysInMonth);
          const orderDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), randomDay);

          const selectedProduct = pickProduct();

          workOrders.push({
            tenant_id,
            wo_number: `WO-IND-${crypto.randomUUID().substring(0, 8)}`,
            product_category: selectedProduct,
            country: 'India',
            region,
            state,
            district: state,
            city: `${state} City ${hubIdx}`,
            partner_hub: partnerHub,
            pin_code: pinCode,
            status: 'completed',
            created_at: orderDate.toISOString(),
            updated_at: orderDate.toISOString(),
          });
          totalRecords++;
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
  }

  return { geoData, workOrders, totalRecords };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const tenant_id: string = body.tenant_id ?? crypto.randomUUID();
    const requestJobId: string | undefined = body.job_id;
    const step: SeedStep = body.step ?? 'init';
    const state_index: number = typeof body.state_index === 'number' ? body.state_index : 0;

    const job_id = requestJobId || crypto.randomUUID();
    const trace_id = crypto.randomUUID();

    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);

    console.log(`India seed handler => step=${step} state_index=${state_index} job=${job_id} trace=${trace_id}`);

    // INIT: enqueue job and chain first processing step, return 202 immediately
    if (step === 'init') {
      // Create/insert queue entry (idempotent by job_id)
      const { data: existing } = await supabase
        .from('seed_queue')
        .select('job_id, status')
        .eq('job_id', job_id)
        .maybeSingle();

      if (!existing) {
        const { error: qErr } = await supabase
          .from('seed_queue')
          .insert({
            job_id,
            tenant_id,
            seed_type: 'india_operational',
            payload: { months: 12 },
            status: 'queued',
            started_at: new Date().toISOString(),
            trace_id
          });
        if (qErr) throw qErr;
      }

      // Kick off first processing step in the background
      // @ts-ignore - Edge runtime provides waitUntil
      (globalThis as any).EdgeRuntime?.waitUntil(
        supabase.functions.invoke('seed-india-data', {
          body: { tenant_id, job_id, step: 'process', state_index: 0 }
        }).then((res) => {
          console.log('Chained first state seed invoked', res.status);
        }).catch((e) => console.error('Chain invoke error', e))
      );

      return new Response(
        JSON.stringify({
          accepted: true,
          job_id,
          tenant_id,
          trace_id,
          message: 'Seeding started. Processing in background by state.'
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PROCESS: handle one state per invocation to avoid timeouts
    const state = INDIA_STATES[state_index];
    if (!state) {
      return new Response(JSON.stringify({ error: 'Invalid state_index' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const region = findRegionForState(state);

    // Generate data for this state
    const { geoData, workOrders, totalRecords } = buildStateData(
      tenant_id,
      state,
      region,
      startDate,
      endDate,
    );

    console.log(`State ${state} -> geo: ${geoData.length}, orders: ${totalRecords}`);

    // Upsert geography for this state
    // Upsert in manageable chunks
    for (let i = 0; i < geoData.length; i += 1000) {
      const { error } = await supabase.from('geography_hierarchy').upsert(geoData.slice(i, i + 1000));
      if (error) throw error;
    }

    // Insert work orders in batches to staging and production
    const batchSize = 1000;
    for (let i = 0; i < workOrders.length; i += batchSize) {
      const batch = workOrders.slice(i, i + batchSize);
      const { error: sErr } = await supabase.from('staging_work_orders').insert(batch as any);
      if (sErr) throw sErr;
      const { error: wErr } = await supabase.from('work_orders').upsert(batch as any);
      if (wErr) throw wErr;
      console.log(`State ${state}: processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(workOrders.length / batchSize)}`);
    }

    // Update queue progress
    const { data: qData } = await supabase
      .from('seed_queue')
      .select('rows_processed')
      .eq('job_id', job_id)
      .maybeSingle();
    const newCount = (qData?.rows_processed || 0) + totalRecords;
    await supabase
      .from('seed_queue')
      .update({ status: 'processing', rows_processed: newCount, updated_at: new Date().toISOString() })
      .eq('job_id', job_id);

    const lastState = state_index >= INDIA_STATES.length - 1;

    if (!lastState) {
      // Chain next state in background and return OK
      // @ts-ignore - Edge runtime provides waitUntil
      (globalThis as any).EdgeRuntime?.waitUntil(
        supabase.functions.invoke('seed-india-data', {
          body: { tenant_id, job_id, step: 'process', state_index: state_index + 1 }
        }).then((res) => console.log(`Chained next state: ${state_index + 1} status=${res.status}`))
          .catch((e) => console.error('Chain invoke error', e))
      );

      return new Response(
        JSON.stringify({
          success: true,
          job_id,
          tenant_id,
          state_processed: state,
          progress: {
            current: state_index + 1,
            total: INDIA_STATES.length
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FINALIZE: run validation across tenant data and trigger forecast
    console.log('Finalizing seed: running validation and triggering forecast...');

    const { data: allData, error: selErr } = await supabase
      .from('work_orders')
      .select('product_category')
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    if (selErr) throw selErr;

    const total = allData?.length || 0;
    const productCounts = PRODUCTS.map(p => {
      const actual = allData?.filter((wo: any) => wo.product_category === p.category).length || 0;
      return {
        category: p.category,
        expected: Math.floor(total * (p.weight / 100)),
        actual,
        count: actual,
        percentage: total ? ((actual / total) * 100).toFixed(1) : '0.0'
      };
    });

    const validationPassed = productCounts.every(pc => {
      const expected = pc.expected || 1; // avoid div by 0
      const variance = Math.abs(pc.actual - expected) / expected;
      return variance < 0.05; // 5% tolerance
    });

    await supabase
      .from('seed_queue')
      .update({ status: validationPassed ? 'completed' : 'failed', completed_at: new Date().toISOString() })
      .eq('job_id', job_id);

    // Record seed info
    await supabase
      .from('seed_info')
      .insert({
        tenant_id,
        seed_type: 'india_operational',
        total_records: total,
        months_covered: 12,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        product_splits: productCounts,
        geography_coverage: {
          states: INDIA_STATES.length,
          regions: Object.keys(REGIONS).length
        },
        validation_status: validationPassed ? 'passed' : 'failed',
        validation_notes: { product_distribution: productCounts },
        status: validationPassed ? 'completed' : 'failed'
      });

    // Trigger forecast via internal function
    const forecastRes = await supabase.functions.invoke('run-forecast-now', {
      body: {
        tenant_id,
        geography_levels: ['country', 'region', 'state', 'partner_hub'],
        trigger: 'seed_complete',
        trace_id
      }
    });

    return new Response(
      JSON.stringify({
        success: validationPassed,
        job_id,
        tenant_id,
        trace_id,
        total_records: total,
        months_covered: 12,
        validation: { status: validationPassed ? 'passed' : 'failed', product_distribution: productCounts },
        forecast: { status: forecastRes.status }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Seeding error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

