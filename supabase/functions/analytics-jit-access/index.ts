import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'request_access':
        result = await requestAccess(supabase, user.id, payload);
        break;
      case 'approve_access':
        result = await approveAccess(supabase, user.id, payload);
        break;
      case 'deny_access':
        result = await denyAccess(supabase, user.id, payload);
        break;
      case 'revoke_access':
        result = await revokeAccess(supabase, user.id, payload);
        break;
      case 'get_pending_requests':
        result = await getPendingRequests(supabase, user.id);
        break;
      case 'get_my_requests':
        result = await getMyRequests(supabase, user.id);
        break;
      case 'check_expired':
        result = await checkExpiredAccess(supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-jit-access:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function requestAccess(supabase: any, userId: string, payload: any) {
  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (!profile?.tenant_id) {
    throw new Error('User tenant not found');
  }

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + payload.duration_hours);

  // Create access request
  const { data: request, error } = await supabase
    .from('analytics_jit_access_requests')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      requester_id: userId,
      resource_type: payload.resource_type,
      resource_id: payload.resource_id,
      requested_permissions: payload.requested_permissions,
      justification: payload.justification,
      duration_hours: payload.duration_hours,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Log access request
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: payload.workspace_id,
    p_event_type: 'jit_access_requested',
    p_event_category: 'security',
    p_action: 'request',
    p_resource_type: payload.resource_type,
    p_resource_id: payload.resource_id,
    p_metadata: { duration_hours: payload.duration_hours }
  });

  // TODO: Send notification to approvers

  return { request };
}

async function approveAccess(supabase: any, userId: string, payload: any) {
  const { requestId } = payload;

  // Update request status
  const { data: request, error } = await supabase
    .from('analytics_jit_access_requests')
    .update({
      status: 'approved',
      approver_id: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;

  // Log approval
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: request.workspace_id,
    p_event_type: 'jit_access_approved',
    p_event_category: 'security',
    p_action: 'approve',
    p_resource_type: request.resource_type,
    p_resource_id: request.resource_id,
    p_metadata: { request_id: requestId, duration_hours: request.duration_hours }
  });

  // TODO: Grant temporary permissions
  // TODO: Send notification to requester

  return { request };
}

async function denyAccess(supabase: any, userId: string, payload: any) {
  const { requestId, reason } = payload;

  const { data: request, error } = await supabase
    .from('analytics_jit_access_requests')
    .update({
      status: 'denied',
      approver_id: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;

  // Log denial
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: request.workspace_id,
    p_event_type: 'jit_access_denied',
    p_event_category: 'security',
    p_action: 'deny',
    p_resource_type: request.resource_type,
    p_resource_id: request.resource_id,
    p_metadata: { request_id: requestId, reason }
  });

  // TODO: Send notification to requester

  return { request };
}

async function revokeAccess(supabase: any, userId: string, payload: any) {
  const { requestId } = payload;

  const { data: request, error } = await supabase
    .from('analytics_jit_access_requests')
    .update({
      status: 'revoked',
      revoked_by: userId,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'approved')
    .select()
    .single();

  if (error) throw error;

  // Log revocation
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: request.workspace_id,
    p_event_type: 'jit_access_revoked',
    p_event_category: 'security',
    p_action: 'revoke',
    p_resource_type: request.resource_type,
    p_resource_id: request.resource_id,
    p_metadata: { request_id: requestId }
  });

  // TODO: Remove granted permissions
  // TODO: Send notification to requester

  return { request };
}

async function getPendingRequests(supabase: any, userId: string) {
  const { data: requests, error } = await supabase
    .from('analytics_jit_access_requests')
    .select(`
      *,
      requester:profiles!analytics_jit_access_requests_requester_id_fkey(full_name, email),
      workspace:analytics_workspaces(name, workspace_type)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { requests };
}

async function getMyRequests(supabase: any, userId: string) {
  const { data: requests, error } = await supabase
    .from('analytics_jit_access_requests')
    .select(`
      *,
      approver:profiles!analytics_jit_access_requests_approver_id_fkey(full_name, email),
      workspace:analytics_workspaces(name, workspace_type)
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { requests };
}

async function checkExpiredAccess(supabase: any) {
  // Find expired requests
  const { data: expiredRequests, error } = await supabase
    .from('analytics_jit_access_requests')
    .select('*')
    .eq('status', 'approved')
    .lt('expires_at', new Date().toISOString());

  if (error) throw error;

  // Update to expired status
  for (const request of expiredRequests || []) {
    await supabase
      .from('analytics_jit_access_requests')
      .update({ status: 'expired' })
      .eq('id', request.id);

    // Log expiration
    await supabase.rpc('log_analytics_operation', {
      p_workspace_id: request.workspace_id,
      p_event_type: 'jit_access_expired',
      p_event_category: 'security',
      p_action: 'expire',
      p_resource_type: request.resource_type,
      p_resource_id: request.resource_id,
      p_metadata: { request_id: request.id }
    });

    // TODO: Remove granted permissions
  }

  return { expired_count: expiredRequests?.length || 0 };
}
