import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['equipment.create']
    });

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const equipmentData = await req.json();
    const tenantId = authResult.context.tenantId;

    // Generate equipment number and QR code
    const { count } = await authResult.context.supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const equipmentNumber = `EQ-${String((count || 0) + 1).padStart(6, '0')}`;
    const qrCode = `QR-${equipmentNumber}-${Date.now()}`;

    const { data: equipment, error } = await authResult.context.supabase
      .from('equipment')
      .insert({
        ...equipmentData,
        tenant_id: tenantId,
        equipment_number: equipmentNumber,
        qr_code: qrCode
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log equipment history
    await authResult.context.supabase
      .from('equipment_history')
      .insert({
        equipment_id: equipment.id,
        event_type: 'registered',
        event_date: new Date().toISOString(),
        description: 'Equipment registered in system'
      });

    return new Response(JSON.stringify({ equipment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});