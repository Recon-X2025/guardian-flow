import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

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
    // Validate authentication and check for admin role
    const authResult = await validateAuth(req, {
      requiredRoles: ['sys_admin', 'tenant_admin'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { userId, role, tenantId }: AssignRoleRequest = await req.json();

    if (!userId || !role) {
      throw new Error('userId and role are required');
    }

    // Verify the target user exists
    const { data: targetProfile, error: profileError } = await context.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      throw new Error('Target user not found');
    }

    // If tenant admin, verify they're assigning within their tenant
    const isTenantAdmin = context.roles.includes('tenant_admin');
    if (isTenantAdmin && !tenantId) {
      throw new Error('Tenant ID required for tenant admin');
    }

    if (isTenantAdmin && tenantId !== context.tenantId) {
      throw new Error('Cannot assign roles outside your tenant');
    }

    // Assign the role
    const { data: roleData, error: roleError } = await context.supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        tenant_id: tenantId || null,
        granted_by: context.user.id,
      })
      .select()
      .single();

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Log the action
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'role_assigned',
      resourceType: 'user_role',
      resourceId: roleData.id,
      changes: { userId, role, tenantId },
      actorRole: context.roles[0],
      tenantId: tenantId || null,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`Role ${role} assigned to user ${userId} by ${context.user.email}`);

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
