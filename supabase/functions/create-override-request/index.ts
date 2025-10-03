import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOverrideRequest {
  actionType: string;
  entityType: string;
  entityId: string;
  reason: string;
  expiresInMinutes?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['override.request'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;

    const { 
      actionType, 
      entityType, 
      entityId, 
      reason,
      expiresInMinutes = 60 
    }: CreateOverrideRequest = await req.json();

    if (!actionType || !entityType || !entityId || !reason) {
      throw new Error('actionType, entityType, entityId, and reason are required');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Create the override request
    const { data: overrideRequest, error: createError } = await context.supabase
      .from('override_requests')
      .insert({
        requester_id: context.user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        reason: reason,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Override request creation error:', createError);
      throw new Error(`Failed to create override request: ${createError.message}`);
    }

    // Log the action
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'override_requested',
      resourceType: 'override_request',
      resourceId: overrideRequest.id,
      changes: { actionType, entityType, entityId, reason },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      reason: reason,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`Override request created by ${context.user.email} for ${entityType}:${entityId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: overrideRequest,
        message: 'Override request created. Waiting for manager approval with MFA verification.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-override-request:', error);
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
