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
    const { unitSerial, parts } = await req.json();
    
    if (!unitSerial) {
      return new Response(
        JSON.stringify({ error: 'unitSerial is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check warranty record
    const { data: warrantyRecord, error: warrantyError } = await supabase
      .from('warranty_records')
      .select('*')
      .eq('unit_serial', unitSerial)
      .single();

    if (warrantyError) {
      console.error('Warranty lookup error:', warrantyError);
      return new Response(
        JSON.stringify({
          covered: false,
          reason: 'No warranty record found',
          policy_id: null,
          provenance: { checked_at: new Date().toISOString() }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if warranty is active
    const now = new Date();
    const warrantyEnd = new Date(warrantyRecord.warranty_end);
    const isActive = warrantyEnd > now;

    if (!isActive) {
      return new Response(
        JSON.stringify({
          covered: false,
          reason: 'Warranty expired',
          policy_id: warrantyRecord.id,
          warranty_end: warrantyRecord.warranty_end,
          provenance: { checked_at: new Date().toISOString(), record_id: warrantyRecord.id }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check parts coverage if parts are provided
    let partsCoverage = null;
    if (parts && Array.isArray(parts)) {
      const { data: inventoryItems } = await supabase
        .from('inventory_items')
        .select('*')
        .in('sku', parts);

      partsCoverage = parts.map((sku: string) => {
        const item = inventoryItems?.find(i => i.sku === sku);
        // Non-consumable parts are covered by warranty
        const covered = item ? !item.consumable : false;
        return {
          sku,
          covered,
          reason: covered ? 'Non-consumable part covered' : 'Consumable or not found'
        };
      });
    }

    return new Response(
      JSON.stringify({
        covered: true,
        reason: 'Active warranty coverage',
        policy_id: warrantyRecord.id,
        warranty_start: warrantyRecord.warranty_start,
        warranty_end: warrantyRecord.warranty_end,
        coverage_type: warrantyRecord.coverage_type,
        parts_coverage: partsCoverage,
        provenance: {
          checked_at: new Date().toISOString(),
          record_id: warrantyRecord.id,
          model: warrantyRecord.model
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Warranty check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
