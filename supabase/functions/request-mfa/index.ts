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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) throw new Error('Unauthorized');

    const { actionType } = await req.json();

    // Check if user has manager role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasManagerRole = roles?.some(r => ['manager', 'admin'].includes(r.role));
    if (!hasManagerRole) {
      throw new Error('Insufficient permissions. Manager role required.');
    }

    // Generate 6-digit token
    const token = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const hashArray = Array.from(new Uint8Array(tokenHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store MFA token (expires in 5 minutes)
    const { data: mfaToken, error: tokenError } = await supabase
      .from('mfa_tokens')
      .insert({
        user_id: user.id,
        token_hash: hashHex,
        action_type: actionType,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    // In production, send token via SMS/Email
    // For demo, return token (INSECURE - remove in production)
    console.log(`MFA Token for ${user.email}: ${token}`);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'mfa_requested',
      resource_type: 'mfa_token',
      resource_id: mfaToken.id,
      changes: { action_type: actionType },
      correlation_id: crypto.randomUUID()
    });

    return new Response(JSON.stringify({ 
      message: 'MFA token sent',
      token_id: mfaToken.id,
      // DEMO ONLY - remove in production
      demo_token: token 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('MFA request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('Unauthorized') ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});