import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { itemId, locationId, adjustmentType, quantity, reason, notes } = await req.json();

    console.log('Adjusting stock for item:', itemId, 'Type:', adjustmentType, 'Qty:', quantity);

    // Get current stock level
    const { data: stockLevel, error: stockError } = await supabaseClient
      .from('stock_levels')
      .select('*')
      .eq('item_id', itemId)
      .eq('location_id', locationId)
      .single();

    if (stockError) throw stockError;

    let newAvailable = Number(stockLevel.qty_available);

    // Apply adjustment
    if (adjustmentType === 'add') {
      newAvailable += quantity;
    } else if (adjustmentType === 'remove') {
      newAvailable -= quantity;
    } else if (adjustmentType === 'set') {
      newAvailable = quantity;
    }

    // Update stock level
    const { data: updatedStock, error: updateError } = await supabaseClient
      .from('stock_levels')
      .update({
        qty_available: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', stockLevel.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log adjustment
    await supabaseClient.from('audit_trail').insert({
      action: 'inventory_adjusted',
      resource_type: 'stock_level',
      resource_id: stockLevel.id,
      details: {
        itemId,
        locationId,
        adjustmentType,
        quantity,
        previousQty: stockLevel.qty_available,
        newQty: newAvailable,
        reason,
        notes,
        timestamp: new Date().toISOString()
      }
    });

    console.log('Stock adjusted successfully:', updatedStock);

    return new Response(
      JSON.stringify({
        success: true,
        stockLevel: updatedStock,
        message: 'Stock adjusted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
