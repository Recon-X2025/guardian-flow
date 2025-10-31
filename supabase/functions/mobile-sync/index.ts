import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { offline_actions } = await req.json();
    const userId = authResult.context.user.id;
    const results = [];

    for (const action of offline_actions) {
      try {
        // Process each offline action
        const { entity_type, action_type, entity_id, action_data } = action;

        let result;
        
        switch (entity_type) {
          case 'work_order':
            if (action_type === 'update') {
              result = await authResult.context.supabase
                .from('work_orders')
                .update(action_data)
                .eq('id', entity_id)
                .select()
                .single();
            }
            break;
          
          case 'attachment':
            if (action_type === 'insert') {
              result = await authResult.context.supabase
                .from('attachments')
                .insert({ ...action_data, uploader_id: userId })
                .select()
                .single();
            }
            break;
          
          case 'technician_location':
            if (action_type === 'insert') {
              result = await authResult.context.supabase
                .from('technician_locations')
                .insert(action_data)
                .select()
                .single();
            }
            break;
        }

        results.push({
          action_id: action.id,
          status: result?.error ? 'failed' : 'success',
          error: result?.error?.message
        });

        // Update sync queue
        await authResult.context.supabase
          .from('mobile_sync_queue')
          .update({
            sync_status: result?.error ? 'failed' : 'synced',
            synced_at: new Date().toISOString(),
            error_message: result?.error?.message
          })
          .eq('id', action.id);

      } catch (error) {
        results.push({
          action_id: action.id,
          status: 'failed',
          error: (error as Error).message
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});