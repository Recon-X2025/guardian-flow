import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auto-detect database capabilities
    let dbMode = 'RESTRICTED_DB';
    let vectorEnabled = false;
    let triggerSupport = false;

    try {
      const { data } = await supabase.rpc('sql', {
        query: "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      });
      
      if (data && data.length > 0) {
        dbMode = 'SUPABASE_FULL';
        vectorEnabled = true;
        triggerSupport = true;
      }
    } catch (e) {
      console.log('pgvector not available, using RESTRICTED_DB mode with external vector store');
    }

    // Update system config with caching headers
    await supabase.from('system_config').upsert([
      { config_key: 'db_mode', config_value: JSON.stringify(dbMode) },
      { config_key: 'vector_enabled', config_value: JSON.stringify(vectorEnabled) },
      { config_key: 'trigger_support', config_value: JSON.stringify(triggerSupport) },
      { config_key: 'detection_timestamp', config_value: JSON.stringify(new Date().toISOString()) }
    ], { onConflict: 'config_key' });

    return new Response(
      JSON.stringify({
        db_mode: dbMode,
        vector_enabled: vectorEnabled,
        trigger_support: triggerSupport,
        cache_ttl: 300,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        } 
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Detection error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
