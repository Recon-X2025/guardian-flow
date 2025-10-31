import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredRoles: ['sys_admin', 'tenant_admin']
    });

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const partnerData = await req.json();

    // Generate partner number
    const { count } = await authResult.context.supabase
      .from('partners')
      .select('*', { count: 'exact', head: true });

    const partnerNumber = `PART-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: partner, error } = await authResult.context.supabase
      .from('partners')
      .insert({
        ...partnerData,
        partner_number: partnerNumber
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create default commission rule
    await authResult.context.supabase
      .from('commission_rules')
      .insert({
        partner_id: partner.id,
        organization_id: partnerData.organization_id,
        rule_name: 'Default Commission',
        commission_percentage: partner.commission_rate || 10
      });

    return new Response(JSON.stringify({ partner }), {
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