import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify API key and get partner info
    const apiKeyHash = await hashApiKey(apiKey);
    const { data: keyData, error: keyError } = await supabase
      .from('partner_api_keys' as any)
      .select('*, partners(*)')
      .eq('api_key_hash', apiKeyHash)
      .eq('revoked', false)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check rate limits
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    
    const { count: recentRequests } = await supabase
      .from('api_usage_metrics' as any)
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', keyData.partner_id)
      .gte('recorded_at', minuteAgo.toISOString());

    if ((recentRequests || 0) >= keyData.rate_limit_per_minute) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        limit: keyData.rate_limit_per_minute,
        resetAt: new Date(now.getTime() + 60000).toISOString()
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check monthly quota
    if (keyData.monthly_quota && keyData.usage_this_month >= keyData.monthly_quota) {
      return new Response(JSON.stringify({ 
        error: 'Monthly quota exceeded',
        quota: keyData.monthly_quota,
        used: keyData.usage_this_month
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request path and method
    const url = new URL(req.url);
    const path = url.pathname.replace('/api-gateway', '');
    const method = req.method;

    // Route to appropriate handler based on path
    let response;
    if (path.startsWith('/work-orders')) {
      response = await handleWorkOrders(supabase, keyData, method, path, req);
    } else if (path.startsWith('/customers')) {
      response = await handleCustomers(supabase, keyData, method, path, req);
    } else if (path.startsWith('/invoices')) {
      response = await handleInvoices(supabase, keyData, method, path, req);
    } else {
      response = { error: 'Endpoint not found' };
    }

    const responseTime = Date.now() - startTime;

    // Log API usage
    await supabase.from('api_usage_metrics' as any).insert({
      tenant_id: keyData.partners.organization_id,
      partner_id: keyData.partner_id,
      api_endpoint: path,
      http_method: method,
      request_count: 1,
      response_time_ms: responseTime,
      status_code: 200,
      billing_tier: keyData.billing_tier,
      cost_incurred: calculateCost(keyData.billing_tier, path)
    });

    // Update usage counter
    await supabase
      .from('partner_api_keys' as any)
      .update({ 
        usage_this_month: keyData.usage_this_month + 1,
        last_used_at: now.toISOString()
      })
      .eq('id', keyData.id);

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
        'X-Rate-Limit-Remaining': String(keyData.rate_limit_per_minute - (recentRequests || 0))
      }
    });

  } catch (error: any) {
    console.error('API Gateway error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handleWorkOrders(supabase: any, keyData: any, method: string, path: string, req: Request) {
  const scopes = keyData.scopes || [];
  
  if (method === 'GET' && !scopes.includes('read:orders')) {
    return { error: 'Insufficient permissions' };
  }
  if ((method === 'POST' || method === 'PUT') && !scopes.includes('write:orders')) {
    return { error: 'Insufficient permissions' };
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('organization_id', keyData.partners.organization_id)
      .limit(100);
    
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}

async function handleCustomers(supabase: any, keyData: any, method: string, path: string, req: Request) {
  const scopes = keyData.scopes || [];
  
  if (method === 'GET' && !scopes.includes('read:customers')) {
    return { error: 'Insufficient permissions' };
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', keyData.partners.organization_id)
      .limit(100);
    
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}

async function handleInvoices(supabase: any, keyData: any, method: string, path: string, req: Request) {
  const scopes = keyData.scopes || [];
  
  if (method === 'GET' && !scopes.includes('read:invoices')) {
    return { error: 'Insufficient permissions' };
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', keyData.partners.organization_id)
      .limit(100);
    
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}

function calculateCost(tier: string, endpoint: string): number {
  const baseCosts: Record<string, number> = {
    free: 0,
    basic: 0.001,
    pro: 0.0005,
    enterprise: 0.0001
  };
  return baseCosts[tier] || 0;
}