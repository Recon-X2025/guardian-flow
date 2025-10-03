import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
    const { data: overrideRequest, error: createError } = await supabase
      .from('override_requests')
      .insert({
        requester_id: user.id,
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
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'override_requested',
      resource_type: 'override_request',
      resource_id: overrideRequest.id,
      changes: { actionType, entityType, entityId, reason },
    });

    console.log(`Override request created by ${user.email} for ${entityType}:${entityId}`);

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
