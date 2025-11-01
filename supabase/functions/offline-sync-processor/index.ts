import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { action, queueItems } = await req.json();

    if (action === 'sync') {
      const results = [];

      for (const item of queueItems) {
        try {
          await supabaseClient
            .from('offline_sync_queue')
            .update({ status: 'syncing' })
            .eq('id', item.id);

          const { entityType, entityId, operation, payload } = item;

          let result;
          switch (operation) {
            case 'create':
              result = await supabaseClient.from(entityType).insert(payload);
              break;
            case 'update':
              result = await supabaseClient.from(entityType).update(payload).eq('id', entityId);
              break;
            case 'delete':
              result = await supabaseClient.from(entityType).delete().eq('id', entityId);
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          if (result.error) throw result.error;

          await supabaseClient
            .from('offline_sync_queue')
            .update({
              status: 'synced',
              synced_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          results.push({ id: item.id, status: 'success' });
        } catch (error) {
          await supabaseClient
            .from('offline_sync_queue')
            .update({
              status: 'failed',
              retry_count: item.retry_count + 1,
              last_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', item.id);

          results.push({
            id: item.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_pending') {
      const { data, error } = await supabaseClient
        .from('offline_sync_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({ queueItems: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
