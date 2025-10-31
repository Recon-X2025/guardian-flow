import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth, logAuditEvent } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['contracts.create']
    });

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { contract, line_items } = await req.json();
    const tenantId = authResult.context.tenantId;

    // Generate contract number
    const { count } = await authResult.context.supabase
      .from('service_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const contractNumber = `CON-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: newContract, error: contractError } = await authResult.context.supabase
      .from('service_contracts')
      .insert({
        ...contract,
        tenant_id: tenantId,
        contract_number: contractNumber
      })
      .select()
      .single();

    if (contractError) {
      return new Response(JSON.stringify({ error: contractError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert line items
    if (line_items && line_items.length > 0) {
      const items = line_items.map((item: any) => ({
        ...item,
        contract_id: newContract.id
      }));

      await authResult.context.supabase
        .from('contract_line_items')
        .insert(items);
    }

    // Audit log
    await logAuditEvent(authResult.context.supabase, {
      userId: authResult.context.userId,
      action: 'create',
      resourceType: 'service_contract',
      resourceId: newContract.id,
      actorRole: authResult.context.roles[0],
      tenantId
    });

    return new Response(JSON.stringify({ contract: newContract }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});