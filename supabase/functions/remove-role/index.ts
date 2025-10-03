import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemoveRoleRequest {
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

    const { userId, role, tenantId }: RemoveRoleRequest = await req.json();

    if (!userId || !role) {
      throw new Error('userId and role are required');
    }

    // Build the delete query
    let query = supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: deletedRole, error: deleteError } = await query.select().single();

    if (deleteError) {
      console.error('Role removal error:', deleteError);
      throw new Error(`Failed to remove role: ${deleteError.message}`);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'role_removed',
      resource_type: 'user_role',
      resource_id: deletedRole.id,
      changes: { userId, role, tenantId },
      actor_role: adminCheck[0].role,
      tenant_id: tenantId || null,
    });

    console.log(`Role ${role} removed from user ${userId} by ${user.email}`);

    return new Response(
      JSON.stringify({ success: true, data: deletedRole }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in remove-role:', error);
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
