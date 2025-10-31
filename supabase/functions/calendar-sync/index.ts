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

    const { work_order_id, calendar_connection_id } = await req.json();

    // Get work order details
    const { data: workOrder } = await authResult.context.supabase
      .from('work_orders')
      .select('*')
      .eq('id', work_order_id)
      .single();

    if (!workOrder) {
      return new Response(JSON.stringify({ error: 'Work order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get calendar connection
    const { data: connection } = await authResult.context.supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', calendar_connection_id)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Calendar connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create calendar event (simplified - actual implementation would use provider APIs)
    const { data: calendarEvent, error } = await authResult.context.supabase
      .from('calendar_events')
      .insert({
        calendar_connection_id: connection.id,
        work_order_id: workOrder.id,
        title: `Work Order: ${workOrder.wo_number}`,
        description: workOrder.description,
        start_time: workOrder.scheduled_start,
        end_time: workOrder.scheduled_end,
        location: JSON.stringify(workOrder.site_location),
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ calendar_event: calendarEvent }), {
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