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
      requireAuth: true,
      requireRoles: ['sys_admin', 'admin']
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { userId, resourceType, resourceId, permission, durationHours, justification, approvalTicketId } = await req.json();

    console.log('Granting temporary access:', { userId, resourceType, resourceId, permission, durationHours });

    // Validate inputs
    if (!userId || !resourceType || !resourceId || !permission || !durationHours || !justification) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (durationHours < 1 || durationHours > 720) { // Max 30 days
      return new Response(
        JSON.stringify({ error: 'Duration must be between 1 and 720 hours' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Create temporary access grant
    const { data: grant, error: grantError } = await context.supabase
      .from('temporary_access_grants')
      .insert({
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        permission: permission,
        granted_by: context.user.id,
        expires_at: expiresAt.toISOString(),
        justification: justification,
        approval_ticket_id: approvalTicketId || null,
        metadata: {
          requested_duration_hours: durationHours,
          granted_at_ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        }
      })
      .select()
      .single();

    if (grantError) throw grantError;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'temporary_access_granted',
      resourceType: 'access_grant',
      resourceId: grant.id,
      changes: {
        target_user: userId,
        resource: { type: resourceType, id: resourceId },
        permission: permission,
        expires_at: expiresAt.toISOString(),
        justification: justification
      },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log('Temporary access granted:', grant.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        grant: grant,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error granting temporary access:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
