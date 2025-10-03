import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignRoleRequest {
  userId: string;
  role: string;
  tenantId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['sys_admin', 'tenant_admin']);

    if (!adminCheck || adminCheck.length === 0) {
      throw new Error('Insufficient permissions - admin role required');
    }

    const { userId, role, tenantId }: AssignRoleRequest = await req.json();

    if (!userId || !role) {
      throw new Error('userId and role are required');
    }

    // Verify the target user exists
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      throw new Error('Target user not found');
    }

    // If tenant admin, verify they're assigning within their tenant
    const isTenantAdmin = adminCheck.some(r => r.role === 'tenant_admin');
    if (isTenantAdmin && !tenantId) {
      throw new Error('Tenant ID required for tenant admin');
    }

    // Assign the role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        tenant_id: tenantId || null,
        granted_by: user.id,
      })
      .select()
      .single();

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'role_assigned',
      resource_type: 'user_role',
      resource_id: roleData.id,
      changes: { userId, role, tenantId },
      actor_role: adminCheck[0].role,
      tenant_id: tenantId || null,
    });

    console.log(`Role ${role} assigned to user ${userId} by ${user.email}`);

    return new Response(
      JSON.stringify({ success: true, data: roleData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in assign-role:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
