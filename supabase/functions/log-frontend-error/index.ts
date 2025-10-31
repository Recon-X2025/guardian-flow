import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      error_message,
      error_stack,
      component_name,
      user_id,
      tenant_id,
      browser_info,
      url,
      severity = 'error'
    } = await req.json();

    const { error } = await supabase
      .from('frontend_errors')
      .insert({
        error_message,
        error_stack: error_stack || null,
        component_name: component_name || null,
        user_id: user_id || null,
        tenant_id: tenant_id || null,
        browser_info: browser_info || null,
        url: url || null,
        severity,
      });

    if (error) {
      console.error('Failed to log frontend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error logging frontend error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
