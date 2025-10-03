import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RejectOverrideRequest {
  requestId: string;
  rejectionReason?: string;
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

    // Check if user has manager role
    const { data: managerCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['ops_manager', 'tenant_admin', 'sys_admin']);

    if (!managerCheck || managerCheck.length === 0) {
      throw new Error('Insufficient permissions - manager role required');
    }

    const { requestId, rejectionReason }: RejectOverrideRequest = await req.json();

    if (!requestId) {
      throw new Error('requestId is required');
    }

    // Get the override request
    const { data: overrideRequest, error: requestError } = await supabase
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

    // Reject the override request
    const { data: rejectedRequest, error: rejectError } = await supabase
      .from('override_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (rejectError) {
      console.error('Override rejection error:', rejectError);
      throw new Error(`Failed to reject override request: ${rejectError.message}`);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'override_rejected',
      resource_type: 'override_request',
      resource_id: requestId,
      changes: { 
        requestId, 
        rejectionReason,
        actionType: overrideRequest.action_type,
        entityType: overrideRequest.entity_type,
        entityId: overrideRequest.entity_id 
      },
      actor_role: managerCheck[0].role,
      reason: rejectionReason,
    });

    console.log(`Override request ${requestId} rejected by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: rejectedRequest,
        message: 'Override request rejected successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reject-override-request:', error);
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
