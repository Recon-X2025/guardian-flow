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

    const { tokenId, token } = await req.json();

    // Hash provided token
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const hashArray = Array.from(new Uint8Array(tokenHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify token
    const { data: mfaToken, error: tokenError } = await supabase
      .from('mfa_tokens')
      .select('*')
      .eq('id', tokenId)
      .eq('user_id', user.id)
      .eq('token_hash', hashHex)
      .is('used_at', null)
      .single();

    if (tokenError || !mfaToken) {
      throw new Error('Invalid or expired MFA token');
    }

    // Check expiration
    if (new Date(mfaToken.expires_at) < new Date()) {
      throw new Error('MFA token expired');
    }

    // Mark as used
    await supabase
      .from('mfa_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenId);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'mfa_verified',
      resource_type: 'mfa_token',
      resource_id: mfaToken.id,
      changes: { action_type: mfaToken.action_type },
      correlation_id: crypto.randomUUID()
    });

    return new Response(JSON.stringify({ 
      verified: true,
      token_id: tokenId,
      action_type: mfaToken.action_type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('MFA verification error:', error);
    return new Response(JSON.stringify({ error: error.message, verified: false }), {
      status: error.message.includes('Unauthorized') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});