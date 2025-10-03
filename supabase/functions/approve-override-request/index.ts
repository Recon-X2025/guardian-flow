import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveOverrideRequest {
  requestId: string;
  mfaTokenId: string;
  mfaToken: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication and check for manager role + MFA permission
    const authResult = await validateAuth(req, {
      requiredRoles: ['ops_manager', 'tenant_admin', 'sys_admin'],
      requiredPermissions: ['override.approve'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;

    const { requestId, mfaTokenId, mfaToken }: ApproveOverrideRequest = await req.json();

    if (!requestId || !mfaTokenId || !mfaToken) {
      throw new Error('requestId, mfaTokenId, and mfaToken are required');
    }

    // Verify MFA token
    const encoder = new TextEncoder();
    const data = encoder.encode(mfaToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: mfaRecord, error: mfaError } = await context.supabase
      .from('mfa_tokens')
      .select('*')
      .eq('id', mfaTokenId)
      .eq('token_hash', tokenHash)
      .eq('user_id', context.user.id)
      .is('used_at', null)
      .single();

    if (mfaError || !mfaRecord) {
      throw new Error('Invalid or expired MFA token');
    }

    // Check if token is expired
    if (new Date(mfaRecord.expires_at) < new Date()) {
      throw new Error('MFA token has expired');
    }

    // Mark MFA token as used
    await context.supabase
      .from('mfa_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', mfaTokenId);

    // Get the override request
    const { data: overrideRequest, error: requestError } = await context.supabase
      .from('override_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !overrideRequest) {
      throw new Error('Override request not found');
    }

    if (overrideRequest.status !== 'pending') {
      throw new Error(`Override request is already ${overrideRequest.status}`);
    }

    // Check if request is expired
    if (new Date(overrideRequest.expires_at) < new Date()) {
      await context.supabase
        .from('override_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);
      throw new Error('Override request has expired');
    }

    // Approve the override request
    const { data: approvedRequest, error: approveError } = await context.supabase
      .from('override_requests')
      .update({
        status: 'approved',
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
        mfa_verified: true,
        mfa_verified_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (approveError) {
      console.error('Override approval error:', approveError);
      throw new Error(`Failed to approve override request: ${approveError.message}`);
    }

    // Log the action with MFA verification
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'override_approved',
      resourceType: 'override_request',
      resourceId: requestId,
      changes: { 
        requestId, 
        actionType: overrideRequest.action_type,
        entityType: overrideRequest.entity_type,
        entityId: overrideRequest.entity_id 
      },
      actorRole: context.roles[0],
      mfaVerified: true,
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`Override request ${requestId} approved by ${context.user.email} with MFA verification`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: approvedRequest,
        message: 'Override request approved successfully with MFA verification'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in approve-override-request:', error);
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
