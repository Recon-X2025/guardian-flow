import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['inventory.check'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { parts, hubId } = await req.json();

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'parts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    const results = [];

    for (const partRequest of parts) {
      const { sku, quantity } = partRequest;

      // Get inventory item
      const { data: item, error: itemError } = await context.supabase
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
        const { data: stockLevel } = await context.supabase
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

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'inventory_checked',
      resourceType: 'inventory',
      changes: { parts_count: parts.length, all_available: allAvailable, hub_id: hubId },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

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
