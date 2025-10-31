import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, payload, tenant_id, organization_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all webhooks for this event
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('active', true)
      .contains('events', [event_type])
      .or(`tenant_id.eq.${tenant_id},organization_id.eq.${organization_id}`);

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ message: 'No webhooks configured for this event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const webhook of webhooks) {
      const startTime = Date.now();
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...webhook.headers
        };

        if (webhook.secret_key) {
          headers['X-Webhook-Signature'] = webhook.secret_key;
        }

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: event_type,
            timestamp: new Date().toISOString(),
            data: payload
          }),
          signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
        });

        const duration = Date.now() - startTime;
        const responseBody = await response.text();

        // Log webhook execution
        await supabase
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            response_status: response.status,
            response_body: responseBody,
            success: response.ok,
            duration_ms: duration
          });

        results.push({
          webhook_id: webhook.id,
          success: response.ok,
          status: response.status
        });

      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failure
        await supabase
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            success: false,
            error_message: (error as Error).message,
            duration_ms: duration
          });

        results.push({
          webhook_id: webhook.id,
          success: false,
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