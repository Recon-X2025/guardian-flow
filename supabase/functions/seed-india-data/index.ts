import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, job_id: requestJobId } = await req.json();
    const job_id = requestJobId || crypto.randomUUID();
    const trace_id = crypto.randomUUID();
    
    console.log(`Starting India data seeding... Job: ${job_id}, Trace: ${trace_id}`);
    
    // Calculate 12-month period ending last full month
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 11); // 12 months total
    startDate.setDate(1);

    let totalRecords = 0;
    const geoData: any[] = [];
    const workOrders: any[] = [];

    // Generate geography hierarchy and work orders
    for (const [region, states] of Object.entries(REGIONS)) {
      for (const state of states) {
        // 6 hubs per state
        for (let hubIdx = 1; hubIdx <= 6; hubIdx++) {
          const partnerHub = `${state.substring(0, 3).toUpperCase()}-HUB-${hubIdx}`;
          
          // 2-3 pin codes per hub
          const pinCodeCount = 2 + Math.floor(Math.random() * 2);
          for (let pinIdx = 1; pinIdx <= pinCodeCount; pinIdx++) {
            const pinCode = `${100000 + Math.floor(Math.random() * 799999)}`;
            
            // Store geography
            geoData.push({
              country: 'India',
              region,
              state,
              district: state,
              city: `${state} City ${hubIdx}`,
              partner_hub: partnerHub,
              pin_code: pinCode
            });

            // Generate work orders for 12 months
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              const month = currentDate.getMonth();
              
              // Seasonality: May-Sept +30%
              const seasonalityFactor = (month >= 4 && month <= 8) ? 1.3 : 1.0;
              
              // Base monthly volume per pin code: ~40-60 orders
              const baseMonthly = 40 + Math.floor(Math.random() * 20);
              const adjustedMonthly = Math.floor(baseMonthly * seasonalityFactor);
              
              // Generate orders for this month
              for (let i = 0; i < adjustedMonthly; i++) {
                // Random day in month
                const randomDay = 1 + Math.floor(Math.random() * new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
                const orderDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), randomDay);
                
                // Select product based on weights
                const rand = Math.random() * 100;
                let cumulative = 0;
                let selectedProduct = 'PC';
                for (const prod of PRODUCTS) {
                  cumulative += prod.weight;
                  if (rand < cumulative) {
                    selectedProduct = prod.category;
                    break;
                  }
                }

                workOrders.push({
                  tenant_id,
                  wo_number: `WO-IND-${totalRecords + 1}`,
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
                  updated_at: orderDate.toISOString()
                });
                
                totalRecords++;
              }
              
              // Move to next month
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
          }
        }
      }
    }

    console.log(`Generated ${totalRecords} work orders and ${geoData.length} geo entries`);

    // Create seed queue entry
    const { error: queueError } = await supabase
      .from('seed_queue')
      .insert({
        job_id,
        tenant_id,
        seed_type: 'india_operational',
        payload: { months: 12, expected_rows: totalRecords },
        status: 'processing',
        started_at: new Date().toISOString(),
        trace_id
      });

    if (queueError) {
      console.error('Queue creation error:', queueError);
      throw queueError;
    }

    // Insert geography data
    const { error: geoError } = await supabase
      .from('geography_hierarchy')
      .upsert(geoData);

    if (geoError) {
      console.error('Geography insert error:', geoError);
      await supabase.from('seed_queue').update({ 
        status: 'failed', 
        error_message: geoError.message,
        completed_at: new Date().toISOString()
      }).eq('job_id', job_id);
      throw geoError;
    }

    // Insert into staging first
    const batchSize = 1000;
    for (let i = 0; i < workOrders.length; i += batchSize) {
      const batch = workOrders.slice(i, i + batchSize);
      const { error: stagingError } = await supabase
        .from('staging_work_orders')
        .insert(batch);
      
      if (stagingError) {
        console.error('Staging insert error:', stagingError);
        await supabase.from('seed_queue').update({ 
          status: 'failed', 
          error_message: stagingError.message,
          completed_at: new Date().toISOString()
        }).eq('job_id', job_id);
        throw stagingError;
      }
      
      console.log(`Staged batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(workOrders.length / batchSize)}`);
    }

    // Validate staged data
    console.log('Validating staged data...');
    const { data: validationData, error: validationError } = await supabase
      .from('staging_work_orders')
      .select('product_category, created_at')
      .eq('tenant_id', tenant_id);

    if (validationError) throw validationError;

    // Check product distribution
    const productCounts = PRODUCTS.map(p => {
      const actual = validationData?.filter((wo: any) => wo.product_category === p.category).length || 0;
      return {
        category: p.category,
        expected: Math.floor(totalRecords * (p.weight / 100)),
        actual,
        count: actual,
        percentage: ((actual / totalRecords) * 100).toFixed(1)
      };
    });

    const validationPassed = productCounts.every(pc => {
      const variance = Math.abs(pc.actual - pc.expected) / pc.expected;
      return variance < 0.05; // 5% tolerance
    });

    if (!validationPassed) {
      const errorMsg = `Product distribution validation failed: ${JSON.stringify(productCounts)}`;
      console.error(errorMsg);
      await supabase.from('seed_queue').update({ 
        status: 'failed', 
        error_message: errorMsg,
        completed_at: new Date().toISOString()
      }).eq('job_id', job_id);
      throw new Error(errorMsg);
    }

    console.log('Validation passed. Merging to production...');

    // Merge staging to production with conflict handling
    const { error: mergeError } = await supabase
      .from('work_orders')
      .upsert(validationData?.map((row: any) => ({
        ...row,
        tenant_id,
        wo_number: `WO-IND-${crypto.randomUUID().substring(0, 8)}`
      })) || []);

    if (mergeError) {
      console.error('Merge error:', mergeError);
      await supabase.from('seed_queue').update({ 
        status: 'failed', 
        error_message: mergeError.message,
        completed_at: new Date().toISOString()
      }).eq('job_id', job_id);
      throw mergeError;
    }

    // Clean staging
    await supabase.from('staging_work_orders').delete().eq('tenant_id', tenant_id);

    // Update seed queue
    await supabase.from('seed_queue').update({ 
      status: 'completed',
      rows_processed: totalRecords,
      completed_at: new Date().toISOString()
    }).eq('job_id', job_id);

    // Record seed info
    const { error: seedError } = await supabase
      .from('seed_info')
      .insert({
        tenant_id,
        seed_type: 'india_operational',
        total_records: totalRecords,
        months_covered: 12,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        product_splits: productCounts,
        geography_coverage: {
          states: INDIA_STATES.length,
          hubs: Math.floor(geoData.length / 6),
          pin_codes: geoData.length
        },
        validation_status: 'passed',
        validation_notes: { product_distribution: productCounts },
        status: 'completed'
      });

    if (seedError) throw seedError;

    // Auto-trigger forecast generation
    console.log('Triggering forecast generation...');
    const forecastTrigger = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-forecast-now`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id,
          geography_levels: ['country', 'region', 'state', 'partner_hub'],
          trigger: 'seed_complete',
          trace_id
        })
      }
    );

    const forecastResult = await forecastTrigger.json();
    console.log('Forecast triggered:', forecastResult);

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        trace_id,
        total_records: totalRecords,
        months_covered: 12,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        product_splits: productCounts,
        geography_coverage: {
          states: INDIA_STATES.length,
          regions: Object.keys(REGIONS).length,
          hubs: Math.floor(geoData.length / 6),
          pin_codes: geoData.length
        },
        validation: {
          status: 'passed',
          product_distribution: productCounts
        },
        forecast: {
          triggered: forecastTrigger.ok,
          job_ids: forecastResult.job_ids || []
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Seeding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
