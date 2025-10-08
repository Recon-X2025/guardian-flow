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

    const { tenant_id } = await req.json();
    
    console.log('Starting India data seeding...');
    
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

    // Insert geography data
    const { error: geoError } = await supabase
      .from('geography_hierarchy')
      .upsert(geoData, { onConflict: 'geography_key' });

    if (geoError) {
      console.error('Geography insert error:', geoError);
      throw geoError;
    }

    // Insert work orders in batches (1000 at a time)
    const batchSize = 1000;
    for (let i = 0; i < workOrders.length; i += batchSize) {
      const batch = workOrders.slice(i, i + batchSize);
      const { error: woError } = await supabase
        .from('work_orders')
        .insert(batch);
      
      if (woError) {
        console.error('Work order insert error:', woError);
        throw woError;
      }
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(workOrders.length / batchSize)}`);
    }

    // Calculate product splits
    const productCounts = PRODUCTS.map(p => ({
      category: p.category,
      count: workOrders.filter(wo => wo.product_category === p.category).length,
      percentage: ((workOrders.filter(wo => wo.product_category === p.category).length / totalRecords) * 100).toFixed(1)
    }));

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
          hubs: geoData.length / 3, // Approx hubs
          pin_codes: geoData.length
        },
        status: 'completed'
      });

    if (seedError) throw seedError;

    return new Response(
      JSON.stringify({
        success: true,
        total_records: totalRecords,
        months_covered: 12,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        product_splits: productCounts,
        geography_coverage: {
          states: INDIA_STATES.length,
          regions: Object.keys(REGIONS).length,
          hubs: Math.floor(geoData.length / 3),
          pin_codes: geoData.length
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
