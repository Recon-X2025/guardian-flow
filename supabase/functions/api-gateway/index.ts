import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface GatewayRequestBody {
  service?: 'ops' | 'fraud' | 'finance' | 'forecast';
  action?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const INTERNAL_API_SECRET = Deno.env.get('INTERNAL_API_SECRET')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract API key and tenant ID from headers
    const apiKey = req.headers.get('x-api-key');
    const tenantId = req.headers.get('x-tenant-id');
    const method = req.method;

    // Parse request body (support GET with query params)
    let bodyText = '';
    let bodyJson: GatewayRequestBody = {};

    if (method !== 'GET') {
      bodyText = await req.text();
      if (bodyText) {
        try { bodyJson = JSON.parse(bodyText); } catch { /* ignore parse errors */ }
      }
    } else {
      const url = new URL(req.url);
      const service = url.searchParams.get('service') as GatewayRequestBody['service'];
      const action = url.searchParams.get('action') ?? undefined;
      bodyJson = { service, action, data: {} };
    }

    // Validate basic inputs
    if (!bodyJson.service) {
      return jsonError(400, 'Missing service. Expected one of: ops, fraud, finance, forecast', correlationId);
    }

    // Validate API key
    const validation = await validateApiKey(supabase, apiKey, tenantId);
    if (!validation.valid) {
      await logUsage(supabase, {
        tenant_id: tenantId || null,
        api_key_id: null,
        endpoint: `/api/agent/${bodyJson.service}`,
        method,
        status_code: 401,
        response_time: Date.now() - startTime,
        error_message: validation.error,
        correlation_id: correlationId,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });
      return jsonError(401, validation.error || 'Unauthorized', correlationId);
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(
      supabase,
      validation.tenant_id!,
      validation.api_key_id!,
      validation.rate_limit!
    );

    if (!rateLimitCheck.allowed) {
      await logUsage(supabase, {
        tenant_id: validation.tenant_id!,
        api_key_id: validation.api_key_id!,
        endpoint: `/api/agent/${bodyJson.service}`,
        method,
        status_code: 429,
        response_time: Date.now() - startTime,
        error_message: 'Rate limit exceeded',
        correlation_id: correlationId,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });

      await supabase.from('api_overage_logs').insert({
        tenant_id: validation.tenant_id,
        api_key_id: validation.api_key_id,
        daily_limit: validation.rate_limit,
        actual_usage: rateLimitCheck.current_usage,
        overage_count: rateLimitCheck.current_usage - validation.rate_limit!,
      });

      return jsonError(429, `Rate limit exceeded. Daily limit: ${validation.rate_limit}`, correlationId, {
        current_usage: rateLimitCheck.current_usage,
      });
    }

    // Update last_used_at for API key
    await supabase
      .from('tenant_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', validation.api_key_id);

    // Forward request to the correct internal function
    const targetUrl = `${supabaseUrl}/functions/v1/agent-${bodyJson.service}-api`;
    const forwardBody = method === 'GET' ? undefined : JSON.stringify({
      action: bodyJson.action,
      data: bodyJson.data,
    });

    const response = await fetch(targetUrl, {
      method: 'POST', // normalize to POST internally
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'x-tenant-id': validation.tenant_id!,
        'x-correlation-id': correlationId,
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: forwardBody,
    });

    const text = await response.text();
    const responseTime = Date.now() - startTime;

    await logUsage(supabase, {
      tenant_id: validation.tenant_id!,
      api_key_id: validation.api_key_id!,
      endpoint: `/api/agent/${bodyJson.service}`,
      method,
      request_size: forwardBody?.length || 0,
      status_code: response.status,
      response_time: responseTime,
      correlation_id: correlationId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    return new Response(text, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
        'X-Correlation-ID': correlationId,
      },
    });

  } catch (error: any) {
    console.error('API Gateway error:', error);
    return jsonError(500, error.message || 'Internal Server Error', correlationId);
  }
});

function jsonError(status: number, message: string, correlationId: string, extra: any = {}) {
  return new Response(JSON.stringify({ error: message, correlation_id: correlationId, ...extra }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface ApiKeyValidation {
  valid: boolean;
  tenant_id?: string;
  api_key_id?: string;
  rate_limit?: number;
  error?: string;
}

async function validateApiKey(
  supabase: any,
  apiKey: string | null,
  tenantId: string | null
): Promise<ApiKeyValidation> {
  if (!apiKey || !tenantId) {
    return { valid: false, error: 'Missing API key or tenant ID' };
  }

  const { data: keyData, error } = await supabase
    .from('tenant_api_keys')
    .select('id, tenant_id, expiry_date, status, rate_limit')
    .eq('api_key', apiKey)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !keyData) return { valid: false, error: 'Invalid API key' };
  if (keyData.status !== 'active') return { valid: false, error: 'API key is not active' };
  if (new Date(keyData.expiry_date) < new Date()) {
    await supabase.from('tenant_api_keys').update({ status: 'expired' }).eq('id', keyData.id);
    return { valid: false, error: 'API key has expired' };
  }

  return { valid: true, tenant_id: keyData.tenant_id, api_key_id: keyData.id, rate_limit: keyData.rate_limit };
}

async function checkRateLimit(
  supabase: any,
  tenantId: string,
  apiKeyId: string,
  rateLimit: number
): Promise<{ allowed: boolean; current_usage: number }> {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('api_key_id', apiKeyId)
    .gte('timestamp', `${today}T00:00:00`)
    .lte('timestamp', `${today}T23:59:59`);
  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, current_usage: 0 };
  }
  const currentUsage = count || 0;
  return { allowed: currentUsage < rateLimit, current_usage: currentUsage };
}

async function logUsage(supabase: any, logData: any) {
  const { error } = await supabase.from('api_usage_logs').insert(logData);
  if (error) console.error('Failed to log API usage:', error);
}
