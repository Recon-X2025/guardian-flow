import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parts, hubId } = await req.json();

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'parts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    for (const partRequest of parts) {
      const { sku, quantity } = partRequest;

      // Get inventory item
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('sku', sku)
        .single();

      if (itemError || !item) {
        results.push({
          sku,
          available: false,
          source: 'not_found',
          quantity_requested: quantity,
          reason: 'Part not in inventory'
        });
        continue;
      }

      // Check stock levels cascade: hub → OEM → partner → engineer buffer
      const stockSources = ['main', 'oem', 'partner', 'engineer_buffer'];
      let allocated = false;
      let sourceType = null;
      let availableQty = 0;

      for (const source of stockSources) {
        const { data: stockLevel } = await supabase
          .from('stock_levels')
          .select('*')
          .eq('item_id', item.id)
          .eq('location', source)
          .maybeSingle();

        if (stockLevel) {
          const available = stockLevel.qty_available - stockLevel.qty_reserved;
          if (available >= quantity) {
            allocated = true;
            sourceType = source;
            availableQty = available;
            break;
          }
        }
      }

      if (!allocated) {
        // Check if procurement needed
        const leadTime = item.lead_time_days || 0;
        results.push({
          sku,
          available: false,
          source: 'procurement_required',
          quantity_requested: quantity,
          lead_time_days: leadTime,
          reason: 'Insufficient stock - procurement required'
        });
      } else {
        results.push({
          sku,
          available: true,
          source: sourceType,
          quantity_requested: quantity,
          quantity_available: availableQty,
          item_id: item.id,
          consumable: item.consumable,
          unit_price: item.unit_price
        });
      }
    }

    const allAvailable = results.every(r => r.available);

    return new Response(
      JSON.stringify({
        all_available: allAvailable,
        parts: results,
        checked_at: new Date().toISOString(),
        hub_id: hubId,
        cascade_order: ['main', 'oem', 'partner', 'engineer_buffer', 'procurement']
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inventory check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
