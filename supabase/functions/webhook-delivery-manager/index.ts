import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

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

    const { action, ...params } = await req.json();

    console.log('[Webhook Manager] Action:', action);

    switch (action) {
      case 'register_webhook': {
        const { tenant_id, user_id, name, url, events, headers } = params;

        // Generate secret key
        const secretKey = generateSecretKey();

        const { data, error } = await supabase
          .from('developer_webhooks')
          .insert({
            tenant_id,
            user_id,
            name,
            url,
            secret_key: secretKey,
            events,
            headers: headers || {},
            active: true
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Webhook Manager] Webhook registered:', data.id);
        return new Response(JSON.stringify({
          success: true,
          webhook: { ...data, secret_key: secretKey }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'trigger_webhook': {
        const { event_type, payload, tenant_id } = params;

        // Find all active webhooks for this event
        const { data: webhooks, error } = await supabase
          .from('developer_webhooks')
          .select('*')
          .eq('active', true)
          .contains('events', [event_type]);

        if (error) throw error;

        const filteredWebhooks = tenant_id 
          ? webhooks.filter(w => w.tenant_id === tenant_id)
          : webhooks;

        const deliveries = [];

        for (const webhook of filteredWebhooks) {
          // Create delivery record
          const { data: delivery, error: deliveryError } = await supabase
            .from('webhook_deliveries')
            .insert({
              webhook_id: webhook.id,
              event_type,
              payload,
              status: 'pending',
              attempt_count: 0
            })
            .select()
            .single();

          if (deliveryError) {
            console.error('[Webhook Manager] Failed to create delivery:', deliveryError);
            continue;
          }

          deliveries.push(delivery);

          // Attempt immediate delivery
          attemptDelivery(supabase, delivery.id, webhook, payload);
        }

        console.log('[Webhook Manager] Triggered webhooks:', deliveries.length);
        return new Response(JSON.stringify({
          success: true,
          deliveries_created: deliveries.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'retry_failed': {
        const { delivery_id } = params;

        const { data: delivery, error } = await supabase
          .from('webhook_deliveries')
          .select('*, webhook:developer_webhooks(*)')
          .eq('id', delivery_id)
          .single();

        if (error) throw error;

        await attemptDelivery(supabase, delivery.id, delivery.webhook, delivery.payload);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_deliveries': {
        const { webhook_id, status, limit } = params;

        let query = supabase
          .from('webhook_deliveries')
          .select('*')
          .eq('webhook_id', webhook_id);

        if (status) query = query.eq('status', status);

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit || 50);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, deliveries: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'process_retry_queue': {
        // Find all failed deliveries that need retry
        const { data: failedDeliveries, error } = await supabase
          .from('webhook_deliveries')
          .select('*, webhook:developer_webhooks(*)')
          .in('status', ['failed', 'retrying'])
          .lt('attempt_count', 3)
          .order('created_at', { ascending: true })
          .limit(10);

        if (error) throw error;

        let retriedCount = 0;

        for (const delivery of failedDeliveries) {
          const retryPolicy = delivery.webhook.retry_policy || { max_retries: 3, backoff: 'exponential' };
          const delay = calculateBackoff(delivery.attempt_count, retryPolicy.backoff);

          const timeSinceLastAttempt = Date.now() - new Date(delivery.last_attempt_at || delivery.created_at).getTime();

          if (timeSinceLastAttempt >= delay) {
            await attemptDelivery(supabase, delivery.id, delivery.webhook, delivery.payload);
            retriedCount++;
          }
        }

        console.log('[Webhook Manager] Retried deliveries:', retriedCount);
        return new Response(JSON.stringify({
          success: true,
          retried_count: retriedCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[Webhook Manager] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function attemptDelivery(supabase: any, deliveryId: string, webhook: any, payload: any) {
  console.log('[Webhook Manager] Attempting delivery:', deliveryId);

  await supabase
    .from('webhook_deliveries')
    .update({
      status: 'retrying',
      last_attempt_at: new Date().toISOString()
    })
    .eq('id', deliveryId);

  try {
    const signature = await generateSignature(payload, webhook.secret_key);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-ID': deliveryId,
      ...webhook.headers
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseBody = await response.text();

    if (response.ok) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'delivered',
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          delivered_at: new Date().toISOString(),
          attempt_count: supabase.rpc('increment', { x: 1, field_name: 'attempt_count' })
        })
        .eq('id', deliveryId);

      console.log('[Webhook Manager] Delivery successful:', deliveryId);
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
  } catch (error) {
    console.error('[Webhook Manager] Delivery failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        error_message: errorMessage,
        attempt_count: supabase.rpc('increment', { x: 1, field_name: 'attempt_count' })
      })
      .eq('id', deliveryId);
  }
}

function generateSecretKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateSignature(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function calculateBackoff(attempts: number, strategy: string): number {
  if (strategy === 'exponential') {
    return Math.pow(2, attempts) * 1000; // 1s, 2s, 4s, 8s...
  }
  return 5000; // 5 seconds linear
}
