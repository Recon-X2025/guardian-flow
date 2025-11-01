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

    const { itemId, supplierId, quantity, unitPrice, deliveryDate, notes } = await req.json();

    console.log('Creating PO for item:', itemId, 'Qty:', quantity);

    // Get item details
    const { data: item, error: itemError } = await supabaseClient
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // Generate PO number
    const { data: existingPOs } = await supabaseClient
      .from('purchase_orders')
      .select('po_number')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastNum = existingPOs && existingPOs.length > 0
      ? parseInt(existingPOs[0].po_number.split('-').pop() || '0')
      : 0;
    
    const poNumber = `PO-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;

    const totalAmount = quantity * unitPrice;

    // Create PO
    const { data: po, error: poError } = await supabaseClient
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        item_id: itemId,
        supplier_id: supplierId,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        status: 'pending',
        expected_delivery: deliveryDate,
        notes
      })
      .select()
      .single();

    if (poError) throw poError;

    // Log to audit trail
    await supabaseClient.from('audit_trail').insert({
      action: 'purchase_order_created',
      resource_type: 'purchase_order',
      resource_id: po.id,
      details: {
        poNumber,
        itemSku: item.sku,
        quantity,
        totalAmount,
        timestamp: new Date().toISOString()
      }
    });

    console.log('PO created successfully:', poNumber);

    return new Response(
      JSON.stringify({
        success: true,
        purchaseOrder: po,
        message: `Purchase order ${poNumber} created successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('PO creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
