import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

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
    const authResult = await validateAuth(req, {
      requiredRoles: ['sys_admin', 'tenant_admin'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { userId, role, tenantId }: RemoveRoleRequest = await req.json();

    if (!userId || !role) {
      throw new Error('userId and role are required');
    }

    // Build the delete query
    let query = context.supabase
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
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'role_removed',
      resourceType: 'user_role',
      resourceId: deletedRole.id,
      changes: { userId, role, tenantId },
      actorRole: context.roles[0],
      tenantId: tenantId || null,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`Role ${role} removed from user ${userId} by ${context.user.email}`);

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
