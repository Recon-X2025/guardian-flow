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
        status: authResult.error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { customer_id, equipment_id, title, description, priority, preferred_date, preferred_time_slot, contact_name, contact_phone, contact_email, location, photos } = await req.json();

    // Generate request number
    const { count } = await authResult.context.supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true });

    const requestNumber = `SR-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: serviceRequest, error } = await authResult.context.supabase
      .from('service_requests')
      .insert({
        customer_id,
        equipment_id,
        request_number: requestNumber,
        title,
        description,
        priority: priority || 'medium',
        preferred_date,
        preferred_time_slot,
        contact_name,
        contact_phone,
        contact_email,
        location,
        photos: photos || [],
        status: 'submitted'
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send notification to ops team
    await authResult.context.supabase.functions.invoke('notification-send', {
      body: {
        notification_type: 'service_request_created',
        entity_type: 'service_request',
        entity_id: serviceRequest.id,
        priority: priority || 'medium'
      }
    });

    return new Response(JSON.stringify({ service_request: serviceRequest }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});