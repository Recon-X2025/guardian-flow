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
      requiredPermissions: ['warranty.check'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { unitSerial, parts } = await req.json();
    
    if (!unitSerial) {
      return new Response(
        JSON.stringify({ error: 'unitSerial is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check warranty record
    const { data: warrantyRecord, error: warrantyError } = await context.supabase
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
      const { data: inventoryItems } = await context.supabase
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

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'warranty_checked',
      resourceType: 'warranty',
      resourceId: warrantyRecord.id,
      changes: { unit_serial: unitSerial, covered: true, parts_count: parts?.length || 0 },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

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
