import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, createErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, { requireAuth: true });

    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401);
    }

    const { context } = authResult;

    // Fetch profile data for additional user info
    const { data: profile } = await context.supabase
      .from('profiles')
      .select('full_name, email, tenant_id')
      .eq('id', context.user.id)
      .single();

    return new Response(
      JSON.stringify({
        user: {
          id: context.user.id,
          email: context.user.email || profile?.email,
          full_name: profile?.full_name,
        },
        roles: context.roles,
        permissions: context.permissions,
        tenant_id: context.tenantId || profile?.tenant_id,
        is_admin: context.roles.some(r => ['sys_admin', 'tenant_admin'].includes(r)),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('auth-me error:', error);
    return new Response(
      JSON.stringify({
        code: 'internal_error',
        message: 'Failed to fetch user context',
        correlationId: crypto.randomUUID(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
