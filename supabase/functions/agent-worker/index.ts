import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process queued agent tasks
    const { data: tasks } = await supabase
      .from('agent_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    for (const task of tasks || []) {
      await supabase
        .from('agent_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', task.id);

      try {
        await supabase.functions.invoke('agent-runtime', {
          body: {
            agent_id: task.agent_id,
            action: task.action_type,
            parameters: task.payload
          }
        });

        await supabase
          .from('agent_queue')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', task.id);
      } catch (error: any) {
        await supabase
          .from('agent_queue')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }
    }

    return new Response(JSON.stringify({ processed: tasks?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
